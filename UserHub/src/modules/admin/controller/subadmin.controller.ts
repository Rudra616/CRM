import { Request, Response, RequestHandler } from "express";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { successResponse, errorResponse } from "../../../common/utils/apiResponse";
import { hashPassword } from "../../../common/helpers/common.helper";
import {
  findAdminById,
  findSubadminByUsernameOrEmail,
  checkDuplicateSubadminUsernameOrEmail,
  getSubadminsPaginated,
  insertSubadmin,
  updateSubadminById,
  updateSubadminPassword,
  deleteSubadminById,
} from "../service/subadmin.service";
import { USERS_PAGE_SIZE_OPTIONS } from "../service/user.service";
import {
  removeAllAdminTokensForAdminId,
} from "../../token.service";
import { findRoleById } from "../service/rbac.service";
import { isMainAdminRow, MAIN_ADMIN_USERNAME } from "../../../common/utils/adminIdentity";

// ─── Create Subadmin (admin only) ─────────────────────────────────────────────
export const createSubadmin = async (req: Request, res: Response) => {
  try {
    const { username, password, first_name, last_name, phone, email, gender, role_id } = req.body;

    if (String(username).trim().toLowerCase() === MAIN_ADMIN_USERNAME) {
      return errorResponse(res, "Reserved username", 400);
    }

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
    const limitRaw = Number(req.query.limit);
    const search = (req.query.search as string | undefined)?.trim();

    const { items, total, limit } = await getSubadminsPaginated(page, limitRaw, search);

    return successResponse(res, "Subadmins fetched successfully", {
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

// ─── Get Single Subadmin ──────────────────────────────────────────────────────
export const getSubadminById: RequestHandler<{ id: string }>  = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, "Invalid ID", 400);

  try {
    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);
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

    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);

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

    const updated = await findAdminById(id);
    
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

    const subadmin = await findAdminById(id);
    if (!subadmin) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(subadmin)) return errorResponse(res, "Forbidden", 403);

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
    const row = await findAdminById(id);
    if (!row) return errorResponse(res, "Subadmin not found", 404);
    if (isMainAdminRow(row)) return errorResponse(res, "Forbidden", 403);

    await removeAllAdminTokensForAdminId(id);

    const deleted = await deleteSubadminById(id);
    if (!deleted) return errorResponse(res, "Subadmin not found", 404);

    return successResponse(res, "Subadmin deleted successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
