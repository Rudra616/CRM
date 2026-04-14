import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../common/utils/apiResponse";
import {
  createModule,
  createRole,
  getModules,
  getRolePermissions,
  getRoles,
  replaceRolePermissions,
  type RolePermissionInput,
} from "../service/rbac.service";

// Add this import at top of rbac.controller.ts
import { getMyPermissionsByRoleId } from "../service/rbac.service";
import { AuthRequest } from "../../../common/types/AuthRequest";
import { Role } from "../../../common/types/role";
 
export const listModules = async (_req: Request, res: Response) => {
  try {
    const rows = await getModules();
    return successResponse(res, "Modules fetched successfully", rows, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addModule = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return errorResponse(res, "Module name is required", 400);

    const id = await createModule(name);
    return successResponse(res, "Module created successfully", { id }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const listRoles = async (_req: Request, res: Response) => {
  try {
    const rows = await getRoles();
    return successResponse(res, "Roles fetched successfully", rows, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addRole = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return errorResponse(res, "Role name is required", 400);

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

    return successResponse(res, "Role permissions saved successfully", { roleId }, 200);
  } catch (err: any) {
    console.error("[RBAC] savePermissionsByRole failed:", err);
    return errorResponse(res, err.message, 400);
  }
};

// Add this new controller
export const getMyPermissions = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Admin shortcut
    if (user.role === Role.ADMIN) {
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

    const rows = await getMyPermissionsByRoleId(user.role_id);

    const permissions: Record<string, object> = {};

    for (const row of rows) {
      permissions[row.module_name] = {
        can_view: row.can_view,
        can_add: row.can_add,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
      };
    }

    return successResponse(res, "Permissions fetched", { isAdmin: false, permissions }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};