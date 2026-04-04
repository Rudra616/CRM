
import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { Role } from "../../../common/types/role";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import { hashPassword, comparePassword, signToken, buildImageUrl, deleteFileIfExists } from "../../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../../config/uploads";

import {
  findUserByUsernameOrEmail,
  findUserByIdAndRole,
  findAllByRole,
  checkDuplicateUsernameOrEmail,
  insertUser,
  updateUserById,
  updateUserPassword,
  deleteUserByIdAndRole,
} from "../../user/user.service";

import {
  removeAllUserTokensForUserId,
} from "../../token.service";


// create subadmin
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

// get subadmin
export const getSubadmins = async (req: Request, res: Response) => {
  try {
    const subadmins = await findAllByRole(Role.SUBADMIN);
    return successResponse(res, "Subadmins fetched successfully", subadmins, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// update subadmin
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

// delete subadmin
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


// change subadmin password by admin
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

    return successResponse(res, "Subadmin password updated", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};