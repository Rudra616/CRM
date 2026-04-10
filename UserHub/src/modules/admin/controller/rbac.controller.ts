import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../../common/utils/apiResponse";
import {
  createModule,
  createRole,
  getModules,
  getRolePermissions,
  getRoles,
  replaceRolePermissions,
} from "../service/rbac.service";

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
    const key = String(req.body.key ?? "").trim();
    const name = String(req.body.name ?? "").trim();
    if (!key || !name) return errorResponse(res, "Key and name are required", 400);

    const id = await createModule(key, name);
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

    const moduleIds = await getRolePermissions(roleId);
    return successResponse(res, "Role permissions fetched successfully", { roleId, moduleIds }, 200);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const savePermissionsByRole = async (req: Request, res: Response) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) return errorResponse(res, "Invalid role ID", 400);

    const rawModuleIds: unknown[] = Array.isArray(req.body.moduleIds) ? req.body.moduleIds : [];
    const moduleIds: number[] = [...new Set(
      rawModuleIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];
    await replaceRolePermissions(roleId, moduleIds);

    return successResponse(res, "Role permissions saved successfully", { roleId }, 200);
  } catch (err: any) {
    console.error("[RBAC] savePermissionsByRole failed:", err);
    return errorResponse(res, err.message, 400);
  }
};

