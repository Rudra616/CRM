import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../common/types/AuthRequest";
import { Role } from "../../common/types/role";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import { hashPassword, comparePassword, signToken, buildImageUrl, deleteFileIfExists } from "../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../config/uploads";
import {
  findAdminByUsername,
  findAdminById,
  checkDuplicateAdminUsernameOrEmail,
  updateAdminById,
  getUsersPaginatedByRole,
  updateUserStatus,
  updateUserProfileByAdmin,
  softDeleteUserByAdmin,
  getAdminDashboardSummary
} from "./admin.service";
import { updateAdminPassword } from "./password.service";
import {
  findUserByUsernameOrEmail,
  findUserByIdAndRole,
  findAllByRole,
  checkDuplicateUsernameOrEmail,
  insertUser,
  updateUserById,
  updateUserPassword,
  deleteUserByIdAndRole,
  deleteAllUserSessions,
  
} from "../user/user.service";
import {
  upsertAdminToken,
  removeAdminToken,
  removeAllUserTokensForUserId,
  hasActiveUserTokenForUserId,
} from "../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../common/helpers/cookie.helper";

// ─── Admin Login ──────────────────────────────────────────────────────────────

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admin = await findAdminByUsername(username);
    if (!admin) return errorResponse(res, "Invalid credentials", 401);

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

    const token = signToken({
      id: admin.id,
      role: Role.ADMIN,
      username: admin.username,
      firstname: "",
      lastname: "",
      email: admin.email,
      phone: "",
    });
    await upsertAdminToken(admin.id, admin.username, token);
    setAuthCookie(res, token);

    return successResponse(res, "Admin login successful", {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: "admin",
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Admin Logout ─────────────────────────────────────────────────────────────

export const adminLogout = async (req: Request, res: Response) => {
  const token = req.cookies.token;

  if (token) {
    try {
      await removeAdminToken(token);
    } catch {}
  }

  // 🔥 CLEAR COOKIE USING HELPER
  clearAuthCookie(res);
  clearSessionCookies(res);

  return successResponse(res, "Logged out", null, 200);
};

// ─── Admin Profile ────────────────────────────────────────────────────────────

export const getAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const admin = await findAdminById(authReq.user.id);
    if (!admin) return errorResponse(res, "Admin not found", 404);

     if (admin.image_url) {
      admin.image_url = buildImageUrl(req, admin.image_url);
    }
    return successResponse(res, "Admin profile fetched", admin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { username, email } = req.body;

    const isDup = await checkDuplicateAdminUsernameOrEmail(username, email, authReq.user.id);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    const existing = await findAdminById(authReq.user.id);
    let imageUrl: string | null | undefined = existing?.image_url;

    if (req.file) {
      if (existing?.image_url) deleteFileIfExists(existing.image_url);
      imageUrl = buildStoredImagePath(authReq.user.role, authReq.user.id, req.file.filename);
    }

    await updateAdminById(authReq.user.id, username, email, imageUrl);

    const updated = await findAdminById(authReq.user.id);

    if (updated?.image_url) {
  updated.image_url = buildImageUrl(req, updated.image_url);
}
    return successResponse(res, "Admin profile updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

// ─── Subadmin CRUD ────────────────────────────────────────────────────────────

export const createSubadmin = async (req: Request, res: Response) => {
  try {
    const { username, password, firstname, lastname, phone, email, gender } = req.body;

    const existing = await findUserByUsernameOrEmail(username, email);
    if (existing) return errorResponse(res, "Username or email already exists", 409);

    const hashedPassword = await hashPassword(password);
    await insertUser(username, hashedPassword, firstname, lastname, phone, email, Role.SUBADMIN, gender);

    return successResponse(res, "Subadmin created", null, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

export const getSubadmins = async (req: Request, res: Response) => {
  try {
    const subadmins = await findAllByRole(Role.SUBADMIN);
    return successResponse(res, "Subadmins fetched successfully", subadmins, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateSubadmin: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { username, firstname, lastname, phone, email, gender } = req.body;

    const subadmin = await findUserByIdAndRole(id, Role.SUBADMIN);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);

    const isDup = await checkDuplicateUsernameOrEmail(username, email, id);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    await updateUserById(id, username, firstname, lastname, phone, email, undefined, gender);

    const updated = await findUserByIdAndRole(id, Role.SUBADMIN);
    return successResponse(res, "Subadmin updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

export const deleteSubadmin: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const deleted = await deleteUserByIdAndRole(id, Role.SUBADMIN);
    if (!deleted) return errorResponse(res, "Subadmin not found", 404);
    return successResponse(res, "Subadmin deleted", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const changeAdminPassword: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { newPassword } = req.body;
    const hashedPassword = await hashPassword(newPassword);
    const ok = await updateAdminPassword(authReq.user.id, hashedPassword);
    if (!ok) return errorResponse(res, "Failed to update password", 400);

    const token = req.cookies?.token as string | undefined;
    if (token) {
      try {
        await removeAdminToken(token);
      } catch {
        /* ignore */
      }
    }
    clearAuthCookie(res);
    clearSessionCookies(res);

    return successResponse(res, "Password updated. Please sign in again.", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const changeSubadminPasswordByAdmin: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { newPassword } = req.body;
    const subadmin = await findUserByIdAndRole(id, Role.SUBADMIN);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);

    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateUserPassword(id, hashedPassword);
    if (!updated) return errorResponse(res, "Failed to update password", 400);

    await removeAllUserTokensForUserId(id);
    try {
      await deleteAllUserSessions(id);
    } catch (e: any) {
      console.error("deleteAllUserSessions after subadmin password change:", e?.message);
    }

    return successResponse(res, "Subadmin password updated", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};



export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1); // keep page from query
    const limit = 10; // always 10 users per page

    const { items, total } = await getUsersPaginatedByRole(Role.USER, page, limit);

    return successResponse(
      res,
      "Users fetched successfully",
      {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    const updatedUser = await updateUserStatus(userId, status);
    if (!updatedUser) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User updated successfully", updatedUser, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const logoutUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    const wasLoggedIn = await hasActiveUserTokenForUserId(userId);
    await removeAllUserTokensForUserId(userId);
    try {
      await deleteAllUserSessions(userId);
    } catch (sessionErr: any) {
      console.error("deleteAllUserSessions by admin:", sessionErr?.message);
    }

    return successResponse(
      res,
      wasLoggedIn ? "User logged out successfully" : "User was already logged out",
      { wasLoggedIn },
      200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const deleteUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    await removeAllUserTokensForUserId(userId);
    try {
      await deleteAllUserSessions(userId);
    } catch (sessionErr: any) {
      console.error("deleteAllUserSessions before delete:", sessionErr?.message);
    }

    const deleted = await softDeleteUserByAdmin(userId);
    if (!deleted) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
}; 

export const updateUserProfileByAdminController: RequestHandler = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);
    const { username, firstname, lastname, phone, email, gender, status } = req.body;

    const isDup = await checkDuplicateUsernameOrEmail(username, email, userId);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    const updated = await updateUserProfileByAdmin(userId, {
      username,
      firstname,
      lastname,
      phone,
      email,
      gender,
      status,
    });
    if (!updated) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User updated successfully", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const getDashboardSummary: RequestHandler = async (_req, res) => {
  try {
    const summary = await getAdminDashboardSummary();
    return successResponse(res, "Dashboard summary fetched", summary, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};