import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { StaffAuthLevel } from "../../../common/types/role";
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
} from "../service/admin.service";
import { upsertAdminToken, removeAdminToken } from "../../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../../common/helpers/cookie.helper";
import { isMainAdminRow } from "../../../common/utils/adminIdentity";

// ─── Login (admin only) ───────────────────────────────────────────────────────
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admin = await findAdminByUsername(username);
    if (!admin) return errorResponse(res, "Invalid credentials", 401);

    if (!isMainAdminRow(admin)) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

    const token = signToken({
      id:       admin.id,
      role:     StaffAuthLevel.OWNER,
      username: admin.username,
    });

    await upsertAdminToken(admin.id, admin.username, token);
    setAuthCookie(res, token);

    return successResponse(res, "Admin login successful", {
      admin: {
        id:         admin.id,
        username:   admin.username,
        first_name: admin.first_name,
        last_name:  admin.last_name,
        email:      admin.email,
        role:       "admin" as const,
        role_id:    admin.role_id ?? null,
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const adminLogout = async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (token) {
    try { await removeAdminToken(token); } catch { /* ignore */ }
  }
  clearAuthCookie(res);
  clearSessionCookies(res);
  return successResponse(res, "Logged out", null, 200);
};

// ─── Profile ──────────────────────────────────────────────────────────────────
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

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { username, email, first_name, last_name, phone, gender } = req.body;

    const existing = await findAdminById(authReq.user.id);
    if (!existing) return errorResponse(res, "Admin not found", 404);

    const effectiveUsername = isMainAdminRow(existing)
      ? existing.username
      : String(username ?? "").trim();

    const isDup = await checkDuplicateAdminUsernameOrEmail(
      effectiveUsername,
      email,
      authReq.user.id
    );
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    let image_url: string | null | undefined = existing?.image_url;

    if (req.file) {
      if (existing?.image_url) deleteFileIfExists(existing.image_url);
      image_url = buildStoredImagePath(StaffAuthLevel.OWNER, authReq.user.id, req.file.filename);
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

// ─── Change Password ──────────────────────────────────────────────────────────
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardSummary: RequestHandler = async (_req, res) => {
  try {
    const summary = await getAdminDashboardSummary();
    return successResponse(res, "Dashboard summary fetched", summary, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
