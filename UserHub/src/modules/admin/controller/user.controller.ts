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

// ─── List Users (paginated) ───────────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limitRaw = Number(req.query.limit);
    const deletedOnly = String(req.query.deleted ?? "") === "1";
    const status = deletedOnly ? undefined : (req.query.status as string | undefined);
    const search = (req.query.search as string | undefined)?.trim();

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
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const { status } = req.body;

    const updatedUser = await updateUserStatusService(userId, status);
    if (!updatedUser) return errorResponse(res, "User not found", 404);

    if (status !== "active") {
      await removeAllUserTokensForUserId(userId);
    }

    return successResponse(res, "User status updated successfully", updatedUser, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

// ─── Update User Profile ──────────────────────────────────────────────────────
export const updateUserProfileByAdminController: RequestHandler = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const { username, first_name, last_name, phone, email, gender, status } = req.body;

    const isDup = await checkDuplicateUserUsernameOrEmail(username, email, userId);
    if (isDup) return errorResponse(res, "Username or email already exists", 409);

    const updated = await updateUserProfileByAdmin(userId, {
      username, first_name, last_name, phone, email, gender, status,
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

// ─── Logout User ─────────────────────────────────────────────────────────────
export const logoutUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return errorResponse(res, "Invalid user ID", 400);

    const wasLoggedIn = await hasActiveUserTokenForUserId(userId);
    await removeAllUserTokensForUserId(userId);

    return successResponse(res,
      wasLoggedIn ? "User logged out successfully" : "User was already logged out",
      { wasLoggedIn }, 200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Delete User ──────────────────────────────────────────────────────────────
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



