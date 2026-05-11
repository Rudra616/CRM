import { Request, Response, RequestHandler } from "express";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import {
  getUsersPaginated,
  updateUserStatusService,
  updateUserProfileByAdmin,
  softDeleteUserByAdmin,
  checkDuplicateUserUsernameOrEmail,
  USERS_PAGE_SIZE_OPTIONS,
} from "../service/user.service";
import {
  removeAllUserTokensForUserId,
  hasActiveUserTokenForUserId,
} from "../../token.service";
import { emitStatusUpdate, emitUserLogout } from "../../../realtime/socket";
import { AuthRequest } from "../../../common/types/AuthRequest";

/**
 * get users with pagination, search and filter support.
 * 
 * @param req Request with pagination, search and filter query
 * @param res items, total count and pagination info response
 * @returns 
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limitRaw = Number(req.query.limit);
    const deletedOnly = String(req.query.deleted ?? "") === "1";
    const status = deletedOnly ? undefined : (req.query.status as string | undefined);
    const search = (req.query.search as string | undefined);

    const { items, total, limit } = await getUsersPaginated(page, limitRaw, status, search, { deletedOnly });

    return successResponse(res, "Users fetched successfully", {
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

/**
 * get users with pagination, search and filter support.
 * 
 * @param req Request with user ID param and new status in body
 * @param res update status using socket response
 * @returns 
 */
export const updateUserStatus: RequestHandler = async (req, res) => {
    const authReq = req as AuthRequest;
    try {
    const userId = Number(authReq.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const { status } = authReq.body;

    const updatedUser = await updateUserStatusService(userId, status);
    if (!updatedUser) return errorResponse(res, "User not found", 404);

    if (status !== "active") {
      await removeAllUserTokensForUserId(userId);
    }

    // 🔥 SOCKET EMIT
    emitStatusUpdate({
      type: "user_status",
      userId,
      status,
      updatedById: authReq.user.id || 0,
    });

    return successResponse(res, "User status updated successfully", updatedUser, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

/**
 * update user profile by admin
 * 
 * @param req Request with user ID param and updated profile data in body
 * @param res update profile success response
 * @returns 
 */
export const updateUserProfileByAdminController: RequestHandler = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const { username, first_name, last_name, phone, email, gender } = req.body;

    const isDup = await checkDuplicateUserUsernameOrEmail(username, email, userId);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    const updated = await updateUserProfileByAdmin(userId, {
      username,
      first_name,
      last_name,
      phone,
      email,
      gender,
    });

    if (!updated) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User updated successfully", updated, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

/**
 * logout user by admin - invalidates all active tokens for the user, effectively logging them out from all sessions.
 * 
 * @param req Request with user ID param
 * @param res logout success response
 * @returns 
 */
export const logoutUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const wasLoggedIn = await hasActiveUserTokenForUserId(userId);
    await removeAllUserTokensForUserId(userId);
    if (wasLoggedIn) {
      emitUserLogout({ userId });
    }

    return successResponse(res,
      wasLoggedIn ? "User logged out successfully" : "User was already logged out",
      { wasLoggedIn }, 200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * delete user by admin - performs a soft delete by setting `is_delete` flag, and also invalidates all active tokens for the user.
 * 
 * @param req Request with user ID param 
 * @param res delete success response
 * @returns 
 */
export const deleteUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    await removeAllUserTokensForUserId(userId);

    const deleted = await softDeleteUserByAdmin(userId);
    if (!deleted) return errorResponse(res, "User not found", 404);

    return successResponse(res, "User deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};



