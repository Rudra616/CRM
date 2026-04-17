import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import { hashPassword } from "../../../common/helpers/common.helper";
import {
  findSubadminById,
  findSubadminByUsernameOrEmail,
  checkDuplicateSubadminUsernameOrEmail,
  getSubadminsPaginated,
  insertSubadmin,
  updateSubadminById,
  updateSubadminPassword,
  deleteSubadminById,
} from "../service/subadmin.service";
import {
  removeAllAdminTokensForAdminId,
} from "../../token.service";
import { findRoleById } from "../service/rbac.service";

// ─── Create Subadmin (admin only) ─────────────────────────────────────────────
export const createSubadmin = async (req: Request, res: Response) => {
  try {
    const { username, password, first_name, last_name, phone, email, gender, role_id } = req.body;

    const roleId = Number(role_id);
    if (!Number.isInteger(roleId) || roleId <= 0) return errorResponse(res, "Invalid role", 400);
    const roleRow = await findRoleById(roleId);
    if (!roleRow) return errorResponse(res, "Invalid role", 400);

    const existing = await findSubadminByUsernameOrEmail(username, email);
    if (existing) return errorResponse(res, "Username or email already exists", 409);

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

// ─── Get All Subadmins ────────────────────────────────────────────────────────
export const getSubadmins = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 10;
    const search = (req.query.search as string | undefined)?.trim();
    const { items, total } = await getSubadminsPaginated(page, limit, search);
    return successResponse(res, "Subadmins fetched successfully", {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Get Single Subadmin ──────────────────────────────────────────────────────
export const getSubadminById: RequestHandler<{ id: string }>  = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const subadmin = await findSubadminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    return successResponse(res, "Subadmin fetched", subadmin, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Update Subadmin ──────────────────────────────────────────────────────────
export const updateSubadmin: RequestHandler<{ id: string }>  = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { username, first_name, last_name, phone, email, gender, role_id } = req.body;

    const subadmin = await findSubadminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);

    const isDup = await checkDuplicateSubadminUsernameOrEmail(username, email, id);
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

    const updated = await findSubadminById(id);
    
    return successResponse(res, "Subadmin updated successfully", updated, 200);
    
  } catch (err: any) {
    return errorResponse(res, err.message, 409);
  }
};

// ─── Change Subadmin Password (by admin) ─────────────────────────────────────
export const changeSubadminPasswordByAdmin: RequestHandler<{ id: string }>  = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const { newPassword } = req.body;

    const subadmin = await findSubadminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);

    const hashedPassword = await hashPassword(newPassword);
    const updated = await updateSubadminPassword(id, hashedPassword);
    if (!updated) return errorResponse(res, "Failed to update password", 400);

    // Invalidate all active sessions for this subadmin
    await removeAllAdminTokensForAdminId(id);

    return successResponse(res, "Subadmin password updated successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// ─── Delete Subadmin ──────────────────────────────────────────────────────────
export const deleteSubadmin: RequestHandler<{ id: string }>  = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    // Revoke sessions before deleting
    await removeAllAdminTokensForAdminId(id);

    const deleted = await deleteSubadminById(id);
    if (!deleted) return errorResponse(res, "Subadmin not found", 404);

    return successResponse(res, "Subadmin deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
