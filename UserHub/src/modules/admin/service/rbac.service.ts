import db from "../../../config/db";
import { logServiceError } from "../../../common/helpers/serviceError";

export type ModuleRow = {
  id: number;
  key: string;
  name: string;
  status: "active" | "inactive";
};

export type RoleRow = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export const getModules = async (): Promise<ModuleRow[]> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, `key`, name, status FROM module ORDER BY id DESC"
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("rbac.service", "getModules", error);
    throw error;
  }
};

export const createModule = async (key: string, name: string): Promise<number> => {
  try {
    const [result]: any = await db.query(
      "INSERT INTO module (`key`, name, status) VALUES (?, ?, 'active')",
      [key.trim(), name.trim()]
    );
    return Number(result.insertId);
  } catch (error: unknown) {
    logServiceError("rbac.service", "createModule", error);
    throw error;
  }
};

export const getRoles = async (): Promise<RoleRow[]> => {
  try {
    const [rows]: any = await db.query("SELECT id, name, status FROM role ORDER BY id ASC");
    return rows;
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRoles", error);
    throw error;
  }
};

export const createRole = async (name: string): Promise<number> => {
  try {
    const [result]: any = await db.query(
      "INSERT INTO role (name, status) VALUES (?, 'active')",
      [name.trim().toLowerCase()]
    );
    return Number(result.insertId);
  } catch (error: unknown) {
    logServiceError("rbac.service", "createRole", error);
    throw error;
  }
};

export const getRolePermissions = async (roleId: number): Promise<number[]> => {
  try {
    const [rows]: any = await db.query(
      "SELECT module_id FROM role_permissions WHERE role_id = ? ORDER BY module_id ASC",
      [roleId]
    );
    return rows.map((r: { module_id: number }) => Number(r.module_id));
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRolePermissions", error);
    throw error;
  }
};

export const replaceRolePermissions = async (
  roleId: number,
  moduleIds: number[]
): Promise<void> => {
  const normalized = [...new Set(moduleIds.map((m) => Number(m)).filter((m) => Number.isInteger(m) && m > 0))];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

    if (normalized.length > 0) {
      const values = normalized.map((moduleId) => [roleId, moduleId]);
      await conn.query("INSERT INTO role_permissions (role_id, module_id) VALUES ?", [values]);
    }
    await conn.commit();
  } catch (error: unknown) {
    await conn.rollback();
    logServiceError("rbac.service", "replaceRolePermissions", error);
    throw error;
  } finally {
    conn.release();
  }
};
