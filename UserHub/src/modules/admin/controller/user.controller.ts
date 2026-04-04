import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { Role } from "../../../common/types/role";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import { hashPassword, comparePassword, signToken, buildImageUrl, deleteFileIfExists } from "../../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../../config/uploads";

import {   getUsersPaginatedByRole,
  updateUserStatus,
  updateUserProfileByAdmin,
  softDeleteUserByAdmin, } from "../service/user.service";

import {
  checkDuplicateUsernameOrEmail,
} from "../../user/user.service";
import {
  removeAllUserTokensForUserId,
  hasActiveUserTokenForUserId,
} from "../../token.service";


// get users all with pagination
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

// update user status by admin 
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    const updatedUser = await updateUserStatus(userId, status);
    if (!updatedUser) return errorResponse(res, "User not found", 404);

    if (status !== "active") {
      await removeAllUserTokensForUserId(userId);
    }

    return successResponse(res, "User updated successfully", updatedUser, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

// logout user by admin
export const logoutUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    const wasLoggedIn = await hasActiveUserTokenForUserId(userId);
    await removeAllUserTokensForUserId(userId);

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

// soft delete user by admin
export const deleteUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return errorResponse(res, "Invalid user id", 400);

    await removeAllUserTokensForUserId(userId);

    const deleted = await softDeleteUserByAdmin(userId);
    if (!deleted) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
}; 

// update user profile
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

    if (updated.status !== "active") {
      await removeAllUserTokensForUserId(userId);
    }

    return successResponse(res, "User updated successfully", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

