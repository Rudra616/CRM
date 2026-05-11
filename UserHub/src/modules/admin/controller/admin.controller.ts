import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import {
  hashPassword,
  comparePassword,
  signToken,
  buildImageUrl,
  deleteFileIfExists,
} from "../../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../../config/uploads";
import {
  findAdminByUsername,
  findAdminById,
  checkDuplicateAdminUsernameOrEmail,
  updateAdminProfileService,
  updateAdminPassword,
  getAdminDashboardSummary,
  getSubadminsPaginated,
  insertSubadmin,
  updateSubadminById,
  updateSubadminPassword,
  deleteSubadminById,
} from "../service/admin.service";
import { upsertAdminToken, removeAdminToken, removeAllAdminTokensForAdminId } from "../../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../../common/helpers/cookie.helper";
import { isMainAdminRow, isSubadminRow, MAIN_ADMIN_USERNAME } from "../../../common/utils/adminIdentity";
import { USERS_PAGE_SIZE_OPTIONS } from "../service/user.service";
import { findRoleById } from "../service/rbac.service";

/**
 * Handles admin login authentication.
 *
 * @param req Request with username and password
 * @param res Response object
 * @returns Authenticated admin response
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admin = await findAdminByUsername(username);
    if (!admin) return errorResponse(res, "Invalid credentials", 401);

    if (isMainAdminRow(admin)) {
      // main admin can always login
    } else if (!isSubadminRow(admin)) {
      return errorResponse(res, "No role assigned. Contact the main administrator.", 403);
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

    const token = signToken({
      id: admin.id,
      username: admin.username,
    });

    await upsertAdminToken(admin.id, admin.username, token);
    setAuthCookie(res, token);

    return successResponse(res, "Login successful", {
      admin: {
        id: admin.id,
        username: admin.username,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role_id: admin.role_id ?? null,
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};


/**
 * Handles admin logout.
 *
 * @param req Request object containing auth token in cookies
 * @param res Response object
 * @returns Logout success response
 */
export const adminLogout = async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (token) {
    try { await removeAdminToken(token); } catch { /* ignore */ }
  }
  clearAuthCookie(res);
  clearSessionCookies(res);
  return successResponse(res, "Logged out", null, 200);
};

/**
 * Fetches admin profile details.
 *
 * @param req Authenticated request object
 * @param res Response object
 * @returns Admin profile response
 */
export const getAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const admin = await findAdminById(authReq.user.id);
    if (!admin) return errorResponse(res, "Admin not found", 404);

    if (admin.image_url) admin.image_url = buildImageUrl(req, admin.image_url);

    return successResponse(res, "Admin profile fetched", admin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Updates admin profile details.
 *
 * @param req Authenticated request containing profile fields and optional file upload
 * @param res Response object
 * @returns Updated admin profile response
 */
export const updateAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { username, email, first_name, last_name, phone, gender } = req.body;

    const existing = await findAdminById(authReq.user.id);
    if (!existing) return errorResponse(res, "Admin not found", 404);

    const effectiveUsername = isMainAdminRow(existing)
      ? existing.username
      : String(username ?? "")

    const isDup = await checkDuplicateAdminUsernameOrEmail(
      effectiveUsername,
      email,
      authReq.user.id
    );
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    let image_url: string | null | undefined = existing?.image_url;

    if (req.file) {
      if (existing?.image_url) deleteFileIfExists(existing.image_url);
      image_url = buildStoredImagePath(
        { is_staff: true, is_main_admin: true },
        authReq.user.id,
        req.file.filename
      );
    }

    await updateAdminProfileService(authReq.user.id, {
      username: effectiveUsername,
      email,
      first_name,
      last_name,
      phone,
      gender,
      image_url,
    });

    const updated = await findAdminById(authReq.user.id);
    if (updated?.image_url) updated.image_url = buildImageUrl(req, updated.image_url);

    return successResponse(res, "Admin profile updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Changes admin password.
 *
 * @param req Authenticated request containing new password
 * @param res Response object
 * @returns Password update response
 */
export const changeAdminPassword: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { newPassword } = req.body;
    const hashedPassword = await hashPassword(newPassword);
    const ok = await updateAdminPassword(authReq.user.id, hashedPassword);
    if (!ok) return errorResponse(res, "Failed to update password", 400);

    const token = req.cookies?.token as string | undefined;
    if (token) { try { await removeAdminToken(token); } catch { /* ignore */ } }
    clearAuthCookie(res);
    clearSessionCookies(res);

    return successResponse(res, "Password updated. Please sign in again.", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Fetches admin dashboard summary.
 *
 * @param res Response object
 * @returns Dashboard summary data
 */
export const getDashboardSummary: RequestHandler = async (_req, res) => {
  try {
    const summary = await getAdminDashboardSummary();
    return successResponse(res, "Dashboard summary fetched", summary, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const createSubadmin = async (req: Request, res: Response) => {
  try {
    const { username, password, first_name, last_name, phone, email, gender, role_id } = req.body;

    if (String(username).trim().toLowerCase() === MAIN_ADMIN_USERNAME) {
      return errorResponse(res, "Reserved username", 400);
    }

    const roleId = Number(role_id);
    if (!Number.isInteger(roleId) || roleId <= 0) return errorResponse(res, "Invalid role", 400);
    const roleRow = await findRoleById(roleId);
    if (!roleRow) return errorResponse(res, "Invalid role", 400);

    const isDup = await checkDuplicateAdminUsernameOrEmail(username, email, 0);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    const hashedPassword = await hashPassword(password);
    await insertSubadmin({
      username,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
      email,
      gender: gender ?? null,
      role_id: roleId,
    });

    return successResponse(res, "Subadmin created successfully", null, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getSubadmins = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limitRaw = Number(req.query.limit);
    const search = req.query.search as string | undefined;

    const { items, total, limit } = await getSubadminsPaginated(page, limitRaw, search);

    return successResponse(res, "Subadmins fetched successfully", {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        limitOptions: [...USERS_PAGE_SIZE_OPTIONS],
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getSubadminById: RequestHandler<{ id: string }> = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);
    return successResponse(res, "Subadmin fetched", subadmin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateSubadmin: RequestHandler<{ id: string }> = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { username, first_name, last_name, phone, email, gender, role_id } = req.body;

    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);

    const isDup = await checkDuplicateAdminUsernameOrEmail(username, email, id);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    let roleIdUpdate: number | undefined;
    if (role_id !== undefined && role_id !== null && role_id !== "") {
      const rid = Number(role_id);
      if (!Number.isInteger(rid) || rid <= 0) return errorResponse(res, "Invalid role", 400);
      const roleRow = await findRoleById(rid);
      if (!roleRow) return errorResponse(res, "Invalid role", 400);
      roleIdUpdate = rid;
    }

    await updateSubadminById(id, {
      username,
      first_name,
      last_name,
      phone,
      email,
      gender,
      ...(roleIdUpdate !== undefined ? { role_id: roleIdUpdate } : {}),
    });
    await removeAllAdminTokensForAdminId(id);

    const updated = await findAdminById(id);
    return successResponse(res, "Subadmin updated successfully", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

export const changeSubadminPasswordByAdmin: RequestHandler<{ id: string }> = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { newPassword } = req.body;

    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);

    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateSubadminPassword(id, hashedPassword);
    if (!updated) return errorResponse(res, "Failed to update password", 400);

    await removeAllAdminTokensForAdminId(id);
    return successResponse(res, "Subadmin password updated successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const deleteSubadmin: RequestHandler<{ id: string }> = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const row = await findAdminById(id);
    if (!row) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(row)) return errorResponse(res, "Forbidden", 403);

    await removeAllAdminTokensForAdminId(id);
    const deleted = await deleteSubadminById(id);
    if (!deleted) return errorResponse(res, "Subadmin not found", 404);

    return successResponse(res, "Subadmin deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
