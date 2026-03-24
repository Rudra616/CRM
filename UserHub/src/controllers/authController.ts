import { Request, Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { successResponse, errorResponse } from "../utils/apiResponse";
import { Role } from "../types/role";
import {
  registerUserService,
  loginService,
  createSubadminService,
  getUsersService,
  getSubadminsService,
  getProfileService,
  updateProfileService,
  updateSubadminService,
  deleteSubadminService,
  loginAdminService,
  updateAdminProfileService,
  getAdminProfileService,
  logoutUserService,
  logoutAdminService,
  sendResetPasswordEmailService,
  resetPasswordService
} from "../services/userService";
import { AuthRequest } from "../types/AuthRequest";
import { storeUserTokenService } from "../services/userService";
import { storeAdminTokenService } from "../services/userService";
import path from "path";
import fs from "fs";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const user = await registerUserService(req.body);

    // Generate token (same as login)
    const token = jwt.sign(
      { id: user.id, role: user.role_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // Store token
    await storeUserTokenService(user.id, user.username, user.role_id, token);

    const roleStr = user.role_id === 2 ? "subadmin" : "user";

    return successResponse(res, "User registered successfully", {
      token,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        gender: user.gender,   
        role: roleStr,
      },
    }, 201);

  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await loginService(username);
    if (!user) return errorResponse(res, "User not found", 404);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return errorResponse(res, "Invalid password", 401);

    const token = jwt.sign(
      { id: user.id, role: user.role_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
    await storeUserTokenService(user.id, user.username, user.role_id, token);
    const roleStr = user.role_id === 2 ? "subadmin" : "user";
    return successResponse(res, "Login successful", {
      token,
      user: {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
            gender: user.gender,
        role: roleStr,
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
export const logout = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return successResponse(res, "Logged out", null, 200);
  try {
    await logoutUserService(token);
    await logoutAdminService(token);
  } catch {
    // ignore - token may already be removed
  }
  return successResponse(res, "Logged out", null, 200);
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admin = await loginAdminService(username, password);
    if (!admin) return errorResponse(res, "Invalid credentials", 401);

    const token = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );
    await storeAdminTokenService(admin.id, admin.username, token);
    return successResponse(res, "Admin login successful", {
      token,
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


export const createSubadmin = async (req: Request, res: Response) => {
  try {
    await createSubadminService(req.body);
    return successResponse(res, "Subadmin created", null, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 409); // 409 Conflict (duplicate)
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getUsersService();
    return successResponse(res, "Users fetched", users, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// GET ALL SUBADMINS — 200 OK
export const getSubadmins = async (req: Request, res: Response) => {
  try {
    const subadmins = await getSubadminsService();
    return successResponse(res, "Subadmins fetched successfully", subadmins, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    return errorResponse(res, "Unauthorized", 401);
  }

  try {
    const profile = await getProfileService(authReq.user.id);
    if (!profile) return errorResponse(res, "User not found", 404);
    return successResponse(res, "Profile fetched", profile, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// authController.ts

// Update the user profile with optional image upload
export const updateProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else {
      const existing = await getProfileService(authReq.user.id);
      imageUrl = existing?.image_url ?? undefined;
    }

    const updatedUser = await updateProfileService(authReq.user.id, {
      ...req.body,
      image_url: imageUrl,
        gender: req.body.gender, 
    });

    if (!updatedUser) return errorResponse(res, "User not found", 404);
    return successResponse(res, "Profile updated", updatedUser, 200);
  } catch (err: any) {
    return errorResponse(res, err?.message || "Update failed", 409);
  }
};

export const updateSubadmin: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(idParam ?? ""), 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const updated = await updateSubadminService(id, req.body);
    if (!updated) return errorResponse(res, "Subadmin not found", 404);
    return successResponse(res, "Subadmin updated", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err?.message || "Update failed", 409);
  }
};

export const deleteSubadmin: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(idParam ?? ""), 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const ok = await deleteSubadminService(id);
    if (!ok) return errorResponse(res, "Subadmin not found", 404);
    return successResponse(res, "Subadmin deleted", null, 200);
  } catch (err: any) {
    return errorResponse(res, err?.message || "Delete failed", 500);
  }
};


export const getAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    return errorResponse(res, "Unauthorized", 401);
  }

  try {
    const admin = await getAdminProfileService(authReq.user.id);

    if (!admin) return errorResponse(res, "Admin not found", 404);

    return successResponse(res, "Admin profile fetched", admin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};


export const updateAdminProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return errorResponse(res, "Unauthorized", 401);

  try {
    const existing = await getAdminProfileService(authReq.user.id);

    let imageUrl: string | undefined = existing?.image_url ?? undefined;

    // If new image uploaded
    if (req.file) {

      // delete old image if exists
      if (existing?.image_url) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          existing.image_url
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      imageUrl = `/uploads/${req.file.filename}`;
    }

    const admin = await updateAdminProfileService(authReq.user.id, {
      ...req.body,
      image_url: imageUrl,
    });

    if (!admin) return errorResponse(res, "Admin not found", 404);

    return successResponse(res, "Admin profile updated", admin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};



// Send password reset email
export const sendResetPasswordEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const token = await sendResetPasswordEmailService(email);

    return successResponse(res, "Password reset email sent", { token }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    await resetPasswordService(token, newPassword);

    return successResponse(res, "Password reset successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};