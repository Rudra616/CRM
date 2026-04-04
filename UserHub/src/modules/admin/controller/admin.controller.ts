import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { Role } from "../../../common/types/role";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import { hashPassword, comparePassword, signToken, buildImageUrl, deleteFileIfExists } from "../../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../../config/uploads";

import {   findAdminByUsername,findAdminById,
  checkDuplicateAdminUsernameOrEmail,
  updateAdminById,
  updateAdminPassword,
  getAdminDashboardSummary } from "../service/admin.service";

import {
  upsertAdminToken,
  removeAdminToken,
} from "../../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../../common/helpers/cookie.helper";


// get dashboard for admin 
export const getDashboardSummary: RequestHandler = async (_req, res) => {
  try {
    const summary = await getAdminDashboardSummary();
    return successResponse(res, "Dashboard summary fetched", summary, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};


// login
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

// admin logout 
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

// admin profile
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


// update admin profile
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

// change admin password
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
