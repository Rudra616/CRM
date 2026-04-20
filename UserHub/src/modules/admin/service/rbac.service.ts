import db from "../../../config/db";
import { logServiceError } from "../../../common/helpers/serviceError";
import { USERS_PAGE_SIZE_OPTIONS, normalizeListPageLimit } from "./user.service";
import type {
  ModuleRow,
  ModuleTableRow,
  MyPermissionRow,
  RolePermissionInput,
  RolePermissionRow,
  RoleRow,
  RoleTableRow,
} from "../types/rbac.types";

/** Pivot table for RBAC. Set DB_ROLE_PERMISSION_TABLE if your MySQL name differs (e.g. role_permissions). */
const ROLE_PERMISSION_TABLE = (() => {
  // const t = process.env.DB_ROLE_PERMISSION_TABLE?.trim();
  // if (t && /^[a-zA-Z0-9_]+$/.test(t)) return t;
  return "role_permission";
})();

const rp = () => `\`${ROLE_PERMISSION_TABLE}\``;

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

const activeModuleNameExists = async (
  name: string,
  excludeModuleId?: number
): Promise<boolean> => {
  const params: unknown[] = [name];
  let sql =
    "SELECT id FROM module WHERE COALESCE(is_delete, 0) = 0 AND LOWER(name) = LOWER(?)";
  if (excludeModuleId !== undefined) {
    sql += " AND id <> ?";
    params.push(excludeModuleId);
  }
  sql += " LIMIT 1";
  const [rows]: any = await db.query(sql, params);
  return Array.isArray(rows) && rows.length > 0;
};

const activeRoleNameExists = async (
  name: string,
  excludeRoleId?: number
): Promise<boolean> => {
  const params: unknown[] = [name];
  let sql = "SELECT id FROM role WHERE COALESCE(is_delete, 0) = 0 AND name = ?";
  if (excludeRoleId !== undefined) {
    sql += " AND id <> ?";
    params.push(excludeRoleId);
  }
  sql += " LIMIT 1";
  const [rows]: any = await db.query(sql, params);
  return Array.isArray(rows) && rows.length > 0;
};

export const getModulesPaginated = async (
  page: number,
  limit: number,
  search?: string
): Promise<{ items: ModuleTableRow[]; total: number; limit: number }> => {
  try {
    const safeLimit = normalizeListPageLimit(limit);
    const offset = (Math.max(1, page) - 1) * safeLimit;
    let where = "WHERE COALESCE(is_delete, 0) = 0";
    const params: unknown[] = [];
    if (search && search.trim() !== "") {
      where += " AND name LIKE ?";
      params.push(`%${search.trim()}%`);
    }
    const [[countRow]]: any = await db.query(
      `SELECT COUNT(*) AS total FROM module ${where}`,
      params
    );
    const total = Number(countRow?.total ?? 0);
    const [rows]: any = await db.query(
      `SELECT id, name, status, created_at, updated_at FROM module ${where}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );
    return { items: rows, total, limit: safeLimit };
  } catch (error: unknown) {
    logServiceError("rbac.service", "getModulesPaginated", error);
    throw error;
  }
};

export const updateModuleById = async (
  id: number,
  data: { name?: string; status?: "active" | "inactive" }
): Promise<boolean> => {
  try {
    if (data.name !== undefined && (await activeModuleNameExists(data.name, id))) {
      throw new Error("A module with this name already exists");
    }
    const parts: string[] = [];
    const params: unknown[] = [];
    if (data.name !== undefined) {
      parts.push("name = ?");
      params.push(data.name);
    }
    if (data.status !== undefined) {
      parts.push("status = ?");
      params.push(data.status);
    }
    if (parts.length === 0) return true;
    parts.push("updated_at = NOW()");
    params.push(id);
    const [result]: any = await db.query(
      `UPDATE module SET ${parts.join(", ")} WHERE id = ? AND COALESCE(is_delete, 0) = 0`,
      params
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("rbac.service", "updateModuleById", error);
    throw error;
  }
};

export const softDeleteModuleById = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE module SET is_delete = 1, updated_at = NOW() WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("rbac.service", "softDeleteModuleById", error);
    throw error;
  }
};

export const createModule = async (name: string): Promise<number> => {
  try {
    if (await activeModuleNameExists(name)) {
      throw new Error("A module with this name already exists");
    }
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

export const getRolesPaginated = async (
  page: number,
  limit: number,
  search?: string
): Promise<{ items: RoleTableRow[]; total: number; limit: number }> => {
  try {
    const safeLimit = normalizeListPageLimit(limit);
    const offset = (Math.max(1, page) - 1) * safeLimit;
    let where = "WHERE COALESCE(is_delete, 0) = 0";
    const params: unknown[] = [];
    if (search && search.trim() !== "") {
      where += " AND name LIKE ?";
      params.push(`%${search.trim()}%`);
    }
    const [[countRow]]: any = await db.query(
      `SELECT COUNT(*) AS total FROM role ${where}`,
      params
    );
    const total = Number(countRow?.total ?? 0);
    const [rows]: any = await db.query(
      `SELECT id, name, status, created_at, updated_at FROM role ${where}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );
    return { items: rows, total, limit: safeLimit };
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRolesPaginated", error);
    throw error;
  }
};

export const updateRoleById = async (
  id: number,
  data: { name?: string; status?: "active" | "inactive" }
): Promise<boolean> => {
  try {
    if (data.name !== undefined && (await activeRoleNameExists(data.name, id))) {
      throw new Error("A role with this name already exists");
    }
    const parts: string[] = [];
    const params: unknown[] = [];
    if (data.name !== undefined) {
      parts.push("name = ?");
      params.push(data.name);
    }
    if (data.status !== undefined) {
      parts.push("status = ?");
      params.push(data.status);
    }
    if (parts.length === 0) return true;
    parts.push("updated_at = NOW()");
    params.push(id);
    const [result]: any = await db.query(
      `UPDATE role SET ${parts.join(", ")} WHERE id = ? AND COALESCE(is_delete, 0) = 0`,
      params
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("rbac.service", "updateRoleById", error);
    throw error;
  }
};

export const softDeleteRoleById = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE role SET is_delete = 1, updated_at = NOW() WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("rbac.service", "softDeleteRoleById", error);
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
    if (await activeRoleNameExists(name)) {
      throw new Error("A role with this name already exists");
    }
    const [result]: any = await db.query(
      "INSERT INTO role (name, status) VALUES (?, 'active')",
      [name]
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

/**
 * @returns Permissions for the given role ID (module names + flags).
 */
export const getMyPermissionsByRoleId = async (roleId: number): Promise<MyPermissionRow[]> => {
  try {
    // Align with getPermissionByRoleAndModule: inactive module or role ⇒ no permission rows returned.
    const [rows]: any = await db.query(
      `SELECT m.name AS module_name,
              rp.can_view, rp.can_add, rp.can_edit, rp.can_delete
       FROM ${rp()} rp
       INNER JOIN module m ON m.id = rp.module_id
       INNER JOIN role r ON r.id = rp.role_id
       WHERE rp.role_id = ?
         AND COALESCE(m.is_delete, 0) = 0
         AND COALESCE(r.is_delete, 0) = 0
         AND COALESCE(m.status, 'active') = 'active'
         AND COALESCE(r.status, 'active') = 'active'`,
      [roleId]
    );
    return rows.map((r: any) => ({
      module_name: r.module_name,
      can_view: r.can_view === 1,
      can_add: r.can_add === 1,
      can_edit: r.can_edit === 1,
      can_delete: r.can_delete === 1,
    }));
  } catch (error: unknown) {
    logServiceError("rbac.service", "getMyPermissionsByRoleId", error);
    throw error;
  }
};