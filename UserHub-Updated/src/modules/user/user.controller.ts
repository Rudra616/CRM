import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../common/types/AuthRequest";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  buildImageUrl,
} from "../../common/helpers/common.helper";
import { sendPasswordResetEmail } from "../../common/helpers/user.helper";
import { buildStoredImagePath } from "../../config/uploads";
import {
  findUserByUsernameOrEmail,
  findUserByUsername,
  findUserById,
  findUserByEmail,
  checkDuplicateUsernameOrEmail,
  insertUser,
  updateUserById,
  updateUserPassword,
} from "./user.service";
import {
  upsertUserToken,
  removeUserToken,
  removeAllUserTokensForUserId,
} from "../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../common/helpers/cookie.helper";

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, password, first_name, last_name, phone, email, gender } = req.body;

    const existing = await findUserByUsernameOrEmail(username, email);
    if (existing) return errorResponse(res, "Username or email already exists", 409);

    const hashedPassword = await hashPassword(password);
    await insertUser(username, hashedPassword, first_name, last_name, phone, email, gender, "pending");

    return successResponse(res, "User registered successfully. Awaiting admin approval.", null, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) return errorResponse(res, "User not found", 404);

    if (user.status === "pending")   return errorResponse(res, "Your account is pending approval by admin.", 403);
    if (user.status === "inactive")  return errorResponse(res, "Your account has been deactivated.", 403);
    if (user.status === "delete")    return errorResponse(res, "This account has been deleted.", 403);
    if (user.status !== "active")    return errorResponse(res, "Your account is not active.", 403);

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return errorResponse(res, "Invalid password", 401);

    const token = signToken({
      id: user.id,
      username: user.username,
    });
    await upsertUserToken(user.id, user.username, token);
    setAuthCookie(res, token);

    return successResponse(res, "Login successful", {
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        gender: user.gender,
        status: user.status,
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutUser = async (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (token) {
    try { await removeUserToken(token); } catch { /* ignore */ }
  }
  clearAuthCookie(res);
  clearSessionCookies(res);
  return successResponse(res, "Logged out", null, 200);
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const profile = await findUserById(authReq.user.id);
    if (!profile) return errorResponse(res, "User not found", 404);

    if (profile.image_url) profile.image_url = buildImageUrl(req, profile.image_url);

    return successResponse(res, "Profile fetched", profile, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { username, first_name, last_name, phone, email, gender } = req.body;

    const isDup = await checkDuplicateUsernameOrEmail(username, email, authReq.user.id);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    let image_url: string | null | undefined;
    if (req.file) {
      image_url = buildStoredImagePath("user", authReq.user.id, req.file.filename);
    } else {
      const existing = await findUserById(authReq.user.id);
      image_url = existing?.image_url ?? null;
    }

    await updateUserById(authReq.user.id, {
      username, first_name, last_name, phone, email, gender, image_url,
    });

    const updated = await findUserById(authReq.user.id);
    if (updated?.image_url) updated.image_url = buildImageUrl(req, updated.image_url);

    return successResponse(res, "Profile updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, "Email is required", 400);

    const user = await findUserByEmail(email);
    if (!user) return errorResponse(res, "Email not registered", 404);

    await sendPasswordResetEmail(user.id, email);

    return successResponse(res, "Password reset email sent", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return errorResponse(res, "Token and new password are required", 400);

    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      const msg = err.name === "TokenExpiredError"
        ? "Reset token has expired. Please request a new one."
        : "Invalid reset token.";
      return errorResponse(res, msg, 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateUserPassword(decoded.id, hashedPassword);
    if (!updated) return errorResponse(res, "User not found or password not updated", 404);

    await removeAllUserTokensForUserId(decoded.id);

    return successResponse(res, "Password reset successfully. Please sign in again.", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Verify Reset Token ───────────────────────────────────────────────────────
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return errorResponse(res, "Token is required", 400);

    try {
      verifyToken(token);
    } catch (err: any) {
      const msg = err.name === "TokenExpiredError"
        ? "Reset link has expired. Please request a new one."
        : "Invalid reset link.";
      return errorResponse(res, msg, 400);
    }

    return successResponse(res, "Token is valid", { valid: true }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePassword: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const { newPassword } = req.body;
    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateUserPassword(authReq.user.id, hashedPassword);
    if (!updated) return errorResponse(res, "Failed to update password", 400);

    await removeAllUserTokensForUserId(authReq.user.id);

    const token = req.cookies?.token as string | undefined;
    if (token) { try { await removeUserToken(token); } catch { /* ignore */ } }
    clearAuthCookie(res);
    clearSessionCookies(res);

    return successResponse(res, "Password updated. Please sign in again.", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
