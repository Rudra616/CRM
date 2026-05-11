import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../common/utils/apiResponse";
import {
  createModule,
  createRole,
  getModules,
  getModulesPaginated,
  getRolePermissions,
  getRoles,
  getRolesPaginated,
  replaceRolePermissions,
  softDeleteModuleById,
  softDeleteRoleById,
  updateModuleById,
  updateRoleById,
} from "../service/rbac.service";
import type { RolePermissionInput } from "../types/rbac.types";
import { USERS_PAGE_SIZE_OPTIONS, normalizeListPageLimit } from "../service/user.service";
import { AuthRequest } from "../../../common/types/AuthRequest";
import {
  invalidateSubadminSessionsForModuleId,
  invalidateSubadminSessionsForRoleId,
} from "../../token.service";
import { hasPermissionForUser } from "../../../common/middleware/permission.middleware";
 
/**
 * List all modules
 *  
 * @param req Request object
 * @param res Response object
 * @returns List of all modules
 */
export const listModules = async (_req: Request, res: Response) => {
  try {
    const rows = await getModules();
    return successResponse(res, "Modules fetched successfully", rows, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Fetches paginated modules list with search support.
 *
 * @param req Request object with pagination and search query
 * @param res Response object
 * @returns Paginated modules data
 */
export const listModulesTable = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limitRaw = req.query.limit;
    const limit =
      limitRaw === undefined || limitRaw === ""
        ? 10
        : normalizeListPageLimit(Number(limitRaw));
    const search = (req.query.search as string | undefined);
    const { items, total, limit: safeLimit } = await getModulesPaginated(page, limit, search);
    return successResponse(
      res,
      "Modules fetched successfully",
      {
        items,
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
          limitOptions: [...USERS_PAGE_SIZE_OPTIONS],
        },
      },
      200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Updates module details by ID.
 *
 * @param req Request containing module ID and update data
 * @param res Response object
 * @returns Update status response
 */
export const updateModuleRow = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse(res, "Invalid module ID", 400);
    const body = req.body as { name?: string; status?: "active" | "inactive" };
    const ok = await updateModuleById(id, body);
    if (!ok) return errorResponse(res, "Module not found", 404);
    await invalidateSubadminSessionsForModuleId(id);
    return successResponse(res, "Module updated successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

/**
 * Soft deletes a module by ID.
 *
 * @param req Request containing module ID
 * @param res Response object
 * @returns Delete status response
 */
export const deleteModuleRow = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse(res, "Invalid module ID", 400);
    const ok = await softDeleteModuleById(id);
    if (!ok) return errorResponse(res, "Module not found", 404);
    await invalidateSubadminSessionsForModuleId(id);
    return successResponse(res, "Module removed successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Creates a new module.
 *
 * @param req Request containing module name
 * @param res Response object
 * @returns Created module ID
 */
export const addModule = async (req: Request, res: Response) => {
  try {
    const name = String((req.body as { name?: string }).name ?? "");
    const id = await createModule(name);
    return successResponse(res, "Module created successfully", { id }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

/**
 * Fetches all roles.
 *
 * @param req Request object
 * @param res Response object
 * @returns List of roles
 */
export const listRoles = async (_req: Request, res: Response) => {
  try {
    const rows = await getRoles();
    return successResponse(res, "Roles fetched successfully", rows, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Fetches paginated roles list with search support.
 *
 * @param req Request object with pagination and search query
 * @param res Response object
 * @returns Paginated roles data
 */
export const listRolesTable = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limitRaw = req.query.limit;
    const limit =
      limitRaw === undefined || limitRaw === ""
        ? 10
        : normalizeListPageLimit(Number(limitRaw));
    const search = (req.query.search as string | undefined);
    const { items, total, limit: safeLimit } = await getRolesPaginated(page, limit, search);
    return successResponse(
      res,
      "Roles fetched successfully",
      {
        items,
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
          limitOptions: [...USERS_PAGE_SIZE_OPTIONS],
        },
      },
      200
    );
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Updates role details by ID.
 *
 * @param req Request containing role ID and update data
 * @param res Response object
 * @returns Update status response
 */

export const updateRoleRow = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse(res, "Invalid role ID", 400);
    const body = req.body as { name?: string; status?: "active" | "inactive" };
    const ok = await updateRoleById(id, body);
    if (!ok) return errorResponse(res, "Role not found", 404);
    // await invalidateSubadminSessionsForRoleId(id);
    return successResponse(res, "Role updated successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const deleteRoleRow = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return errorResponse(res, "Invalid role ID", 400);
    const ok = await softDeleteRoleById(id);
    if (!ok) return errorResponse(res, "Role not found", 404);
    await invalidateSubadminSessionsForRoleId(id);
    return successResponse(res, "Role removed successfully", null, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addRole = async (req: Request, res: Response) => {
  try {
    const name = String((req.body as { name?: string }).name ?? "");
    const id = await createRole(name);
    return successResponse(res, "Role created successfully", { id }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const getPermissionsByRole = async (req: Request, res: Response) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) return errorResponse(res, "Invalid role ID", 400);

    const permissions = await getRolePermissions(roleId);
    return successResponse(res, "Role permissions fetched successfully", { roleId, permissions }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const savePermissionsByRole = async (req: Request, res: Response) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) return errorResponse(res, "Invalid role ID", 400);

    const raw = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permissions: RolePermissionInput[] = raw.map((row: unknown) => {
      const o = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        module_id: Number(o.module_id),
        can_view: Boolean(o.can_view),
        can_add: Boolean(o.can_add),
        can_edit: Boolean(o.can_edit),
        can_delete: Boolean(o.can_delete),
      };
    });

    await replaceRolePermissions(roleId, permissions);

    await invalidateSubadminSessionsForRoleId(roleId);

    return successResponse(res, "Role permissions saved successfully", { roleId }, 200);
  } catch (err: any) {
    console.error("[RBAC] savePermissionsByRole failed:", err);
    return errorResponse(res, err.message, 400);
  }
};

export const getMyPermissions = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Main admin (reserved username) — full access; no RBAC matrix.
    if (user.is_main_admin) {
      return successResponse(
        res,
        "Permissions fetched",
        { isAdmin: true, permissions: {} },
        200
      );
    }

    if (!user.role_id) {
      return successResponse(
        res,
        "Permissions fetched",
        { isAdmin: false, permissions: {} },
        200
      );
    }

    const modules = await getModules();
    const permissions: Record<string, { can_view: boolean; can_add: boolean; can_edit: boolean; can_delete: boolean }> = {};

    for (const mod of modules) {
      const moduleName = mod.name;
      permissions[moduleName] = {
        can_view: await hasPermissionForUser(user, moduleName, "can_view"),
        can_add: await hasPermissionForUser(user, moduleName, "can_add"),
        can_edit: await hasPermissionForUser(user, moduleName, "can_edit"),
        can_delete: await hasPermissionForUser(user, moduleName, "can_delete"),
      };
    }

    return successResponse(res, "Permissions fetched", { isAdmin: false, permissions }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};