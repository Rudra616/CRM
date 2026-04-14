import db from "../../../config/db";
import { logServiceError } from "../../../common/helpers/serviceError";

/** Pivot table for RBAC. Set DB_ROLE_PERMISSION_TABLE if your MySQL name differs (e.g. role_permissions). */
const ROLE_PERMISSION_TABLE = (() => {
  const t = process.env.DB_ROLE_PERMISSION_TABLE?.trim();
  if (t && /^[a-zA-Z0-9_]+$/.test(t)) return t;
  return "role_permission";
})();

const rp = () => `\`${ROLE_PERMISSION_TABLE}\``;

export type ModuleRow = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export type RoleRow = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export type RolePermissionRow = {
  module_id: number;
  can_view: 0 | 1;
  can_add: 0 | 1;
  can_edit: 0 | 1;
  can_delete: 0 | 1;
};

export type RolePermissionInput = {
  module_id: number;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export const getModules = async (): Promise<ModuleRow[]> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, name, status FROM module WHERE COALESCE(is_delete, 0) = 0 ORDER BY id DESC"
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("rbac.service", "getModules", error);
    throw error;
  }
};

export const createModule = async (name: string): Promise<number> => {
  try {
    const [result]: any = await db.query(
      "INSERT INTO module (name, status) VALUES (?, 'active')",
      [name]
    );
    return Number(result.insertId);
  } catch (error: unknown) {
    logServiceError("rbac.service", "createModule", error);
    throw error;
  }
};

export const getRoles = async (): Promise<RoleRow[]> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, name, status FROM role WHERE COALESCE(is_delete, 0) = 0 ORDER BY id ASC"
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRoles", error);
    throw error;
  }
};

export const findRoleById = async (id: number): Promise<RoleRow | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, name, status FROM role WHERE id = ? AND COALESCE(is_delete, 0) = 0 LIMIT 1",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("rbac.service", "findRoleById", error);
    throw error;
  }
};

export const createRole = async (name: string): Promise<number> => {
  try {
    const [result]: any = await db.query(
      "INSERT INTO role (name, status) VALUES (?, 'active')",
      [name.toLowerCase()]
    );
    return Number(result.insertId);
  } catch (error: unknown) {
    logServiceError("rbac.service", "createRole", error);
    throw error;
  }
};

export const getRolePermissions = async (roleId: number): Promise<RolePermissionRow[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT module_id, can_view, can_add, can_edit, can_delete
       FROM ${rp()} WHERE role_id = ? ORDER BY module_id ASC`,
      [roleId]
    );
    return rows.map((r: RolePermissionRow) => ({
      module_id: Number(r.module_id),
      can_view: r.can_view ? 1 : 0,
      can_add: r.can_add ? 1 : 0,
      can_edit: r.can_edit ? 1 : 0,
      can_delete: r.can_delete ? 1 : 0,
    }));
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRolePermissions", error);
    throw error;
  }
};

const toFlag = (v: boolean): 0 | 1 => (v ? 1 : 0);

export const replaceRolePermissions = async (
  roleId: number,
  permissions: RolePermissionInput[]
): Promise<void> => {
  const seen = new Set<number>();
  const normalized: { moduleId: number; v: 0 | 1; a: 0 | 1; e: 0 | 1; d: 0 | 1 }[] = [];

  for (const p of permissions) {
    const moduleId = Number(p.module_id);
    if (!Number.isInteger(moduleId) || moduleId <= 0 || seen.has(moduleId)) continue;
    seen.add(moduleId);
    let v = toFlag(Boolean(p.can_view));
    const a = toFlag(Boolean(p.can_add));
    const e = toFlag(Boolean(p.can_edit));
    const d = toFlag(Boolean(p.can_delete));
    if (a || e || d) v = 1;
    if (!v && !a && !e && !d) continue;
    normalized.push({ moduleId, v, a, e, d });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM ${rp()} WHERE role_id = ?`, [roleId]);

    if (normalized.length > 0) {
      const values = normalized.map((row) => [roleId, row.moduleId, row.v, row.a, row.e, row.d]);
      await conn.query(
        `INSERT INTO ${rp()} (role_id, module_id, can_view, can_add, can_edit, can_delete) VALUES ?`,
        [values]
      );
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

// Add this to your existing rbac.service.ts

export type MyPermissionRow = {
  module_name: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

// Different from getRolePermissions — this joins module table to get name
// and returns booleans (not 0|1) ready for frontend
export const getMyPermissionsByRoleId = async (roleId: number): Promise<MyPermissionRow[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT m.name AS module_name,
              rp.can_view, rp.can_add, rp.can_edit, rp.can_delete
       FROM ${rp()} rp
       INNER JOIN module m ON m.id = rp.module_id
       WHERE rp.role_id = ?
         AND COALESCE(m.is_delete, 0) = 0`,
      [roleId]
    );
    return rows.map((r: any) => ({
      module_name: r.module_name,
      can_view:   r.can_view   === 1,
      can_add:    r.can_add    === 1,
      can_edit:   r.can_edit   === 1,
      can_delete: r.can_delete === 1,
    }));
  } catch (error: unknown) {
    logServiceError("rbac.service", "getMyPermissionsByRoleId", error);
    throw error;
  }
};