import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../common/types/AuthRequest";
import { Role } from "../../common/types/role";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import { hashPassword, comparePassword, signToken, verifyToken, buildImageUrl } from "../../common/helpers/common.helper";
import { roleLabel, sendPasswordResetEmail } from "../../common/helpers/user.helper";
import {
  findUserByUsernameOrEmail,
  findUserByUsername,
  findUserById,
  findUserByIdAndRole,
  findUserByEmail,
  findAllByRole,
  checkDuplicateUsernameOrEmail,
  insertUser,
  updateUserById,
  updateUserPassword,
  deleteUserByIdAndRole,
  isResetTokenUsed,
  markResetTokenUsed,
  deleteAllUserSessions
} from "./user.service";
import { upsertUserToken, removeUserToken } from "../token.service";
import { setAuthCookie, clearAuthCookie, clearSessionCookies } from "../../common/helpers/cookie.helper";
import { findAdminById } from "../admin/admin.service";

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, password, firstname, lastname, phone, email, gender } = req.body;

    const existing = await findUserByUsernameOrEmail(username, email);
    if (existing) return errorResponse(res, "Username or email already exists", 409);

    const hashedPassword = await hashPassword(password);
    const insertId = await insertUser(username, hashedPassword, firstname, lastname, phone, email, Role.USER, gender);

    const token = signToken({
      id: insertId,
      role: Role.USER,
      username,
      firstname,
      lastname,
      email,
      phone,
      gender: gender ?? undefined,
    });
    await upsertUserToken(insertId, username, Role.USER, token);
    setAuthCookie(res, token); // 🔥 ADD THIS

    return successResponse(res, "User registered successfully", {
      user: {
        id: insertId,
        username,
        firstname,
        lastname,
        email,
        phone,
        gender,
        role: roleLabel(Role.USER),
      },
    }, 201);
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

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return errorResponse(res, "Invalid password", 401);

    const token = signToken({
      id: user.id,
      role: user.role_id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone ?? "",
      gender: user.gender ?? undefined,
    });
    await upsertUserToken(user.id, user.username, user.role_id, token);

    setAuthCookie(res, token); 

    return successResponse(res, "Login successful", {
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        gender: user.gender,
        role: roleLabel(user.role_id),
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = async (req: Request, res: Response) => {
  const token = req.cookies.token; // 🔥 CHANGED
  if (token) {
    try {
      await removeUserToken(token);
    } catch {
      // token may already be removed — ignore
    }
  }
  clearAuthCookie(res); // 🔥 IMPORTANT
  clearSessionCookies(res);

  return successResponse(res, "Logged out", null, 200);
};

// ─── Session (claims from JWT in httpOnly cookie; client uses this instead of localStorage user) ─

export const getSession: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const token = req.cookies?.token as string | undefined;
  if (!authReq.user || !token) return errorResponse(res, "Unauthorized", 401);

  try {
    const decoded = verifyToken(token) as Record<string, unknown> & { id: number };
    const roleNum = authReq.user.role;

    const uname = decoded.username;
    if (typeof uname === "string" && uname.length > 0) {
      return successResponse(
        res,
        "Session",
        {
          id: Number(decoded.id),
          username: String(decoded.username),
          firstname: String(decoded.firstname ?? ""),
          lastname: String(decoded.lastname ?? ""),
          email: String(decoded.email ?? ""),
          phone: String(decoded.phone ?? ""),
          gender: decoded.gender != null ? String(decoded.gender) : undefined,
          role: roleLabel(roleNum),
        },
        200
      );
    }

    if (roleNum === Role.ADMIN) {
      const admin = await findAdminById(authReq.user.id);
      if (!admin) return errorResponse(res, "Unauthorized", 401);
      return successResponse(res, "Session", {
        id: admin.id,
        username: admin.username,
        firstname: "",
        lastname: "",
        email: admin.email,
        phone: "",
        role: "admin",
      }, 200);
    }

    const row = await findUserById(authReq.user.id);
    if (!row) return errorResponse(res, "Unauthorized", 401);
    return successResponse(res, "Session", {
      id: row.id,
      username: row.username,
      firstname: row.firstname ?? "",
      lastname: row.lastname ?? "",
      email: row.email,
      phone: row.phone ?? "",
      gender: row.gender ?? undefined,
      role: roleLabel(row.role_id),
    }, 200);
  } catch {
    return errorResponse(res, "Unauthorized", 401);
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

export const getProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const profile = await findUserById(authReq.user.id);
    if (!profile) return errorResponse(res, "User not found", 404);
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
    const { username, firstname, lastname, phone, email, newPassword, gender } = req.body;

    const isDup = await checkDuplicateUsernameOrEmail(username, email, authReq.user.id);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    // Keep existing image if no new file uploaded
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = buildImageUrl(req.file.filename);
    } else {
      const existing = await findUserById(authReq.user.id);
      imageUrl = existing?.image_url ?? undefined;
    }

    const hashedPassword =
      newPassword && newPassword.trim().length > 0
        ? await hashPassword(newPassword)
        : undefined;

    await updateUserById(authReq.user.id, username, firstname, lastname, phone, email, imageUrl, gender, hashedPassword);

    const updated = await findUserById(authReq.user.id);
    return successResponse(res, "Profile updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

// ─── Get All Users ────────────────────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await findAllByRole(Role.USER);
    return successResponse(res, "Users fetched", users, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email)
      return errorResponse(res, 'Email is required', 400);

    const user = await findUserByEmail(email);
    if (!user)
      return errorResponse(res, 'Email not registered', 404);

    await sendPasswordResetEmail(user.id, email);

    return successResponse(res, 'Password reset email sent', null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Reset Password ───────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return errorResponse(res, 'Token and new password are required', 400);

    // 1. Verify JWT signature + expiry
    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Reset token has expired. Please request a new one.'
        : 'Invalid reset token.';
      return errorResponse(res, msg, 400);
    }

    // 2. Check if already used
    const used = await isResetTokenUsed(token);
    if (used)
      return errorResponse(res, 'This reset link has already been used.', 400);

    // 3. Update password
    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateUserPassword(decoded.id, hashedPassword);
    if (!updated)
      return errorResponse(res, 'User not found or password not updated', 404);

    // 4. Mark token used + kill all sessions (session cleanup must not fail the whole flow)
    await markResetTokenUsed(token);
    try {
      await deleteAllUserSessions(decoded.id);
    } catch (sessionErr: any) {
      console.error('deleteAllUserSessions after reset:', sessionErr?.message);
    }

    return successResponse(res, 'Password reset successfully', null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Verify Reset Token ───────────────────────────────────────
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token)
      return errorResponse(res, 'Token is required', 400);

    // 1. Verify JWT
    try {
      verifyToken(token);
    } catch (err: any) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Reset link has expired. Please request a new one.'
        : 'Invalid reset link.';
      return errorResponse(res, msg, 400);
    }

    // 2. Check already used
    const used = await isResetTokenUsed(token);
    if (used)
      return errorResponse(res, 'This reset link has already been used.', 400);

    return successResponse(res, 'Token is valid', { valid: true }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};