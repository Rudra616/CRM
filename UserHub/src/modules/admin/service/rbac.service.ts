import db from "../../../config/db";
import { logServiceError } from "../../../common/helpers/serviceError";
import { USERS_PAGE_SIZE_OPTIONS, normalizeListPageLimit } from "./user.service";
import type {
  ModuleTableRow,
  MyPermissionRow,
  RolePermissionInput,
  RolePermissionRow,
  RoleRow,
  RoleTableRow,
} from "../types/rbac.types";
import { softDelete } from "../../../common/helpers/service.helper";

/** Pivot table for RBAC. Set DB_ROLE_PERMISSION_TABLE if your MySQL name differs (e.g. role_permissions). */
const ROLE_PERMISSION_TABLE = (() => {
  // const t = process.env.DB_ROLE_PERMISSION_TABLE?.trim();
  // if (t && /^[a-zA-Z0-9_]+$/.test(t)) return t;
  return "role_permission";
})();


const rp = () => `\`${ROLE_PERMISSION_TABLE}\``;
const toFlag = (v: boolean): 0 | 1 => (v ? 1 : 0);

/**
 * Check if exist table name was exist and its not delete also with case-insensitive
 * 
 * @param table Table name (moduel and role)
 * @param name Name to check exist or not
 * @param excludeId - Optional ID to exclude from check (used during update operations)
 * @param caseInsensitive If true performs case insensitive name compare
 * @returns true if matching record exists ,otherwise false
 */
const activeNameExists = async (
  table: "module" | "role",
  name: string,
  excludeId?: number,
  caseInsensitive = false
): Promise<boolean> => {
  const params: unknown[] = [name];

  let sql = `SELECT id FROM ${table} WHERE COALESCE(is_delete, 0) = 0`;

  sql += caseInsensitive
    ? " AND LOWER(name) = LOWER(?)"
    : " AND name = ?";

  if (excludeId !== undefined) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const [rows]: any = await db.query(sql, params);
  return Array.isArray(rows) && rows.length > 0;
};

/**
 * Fetches paginated modules list with optional search filtering.
 *
 * @param page Current page number
 * @param limit Number of records per page
 * @param search Optional search keyword for module name
 * @returns Paginated modules data
 */
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
       ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );
    return { items: rows, total, limit: safeLimit };
  } catch (error: unknown) {
    logServiceError("rbac.service", "getModulesPaginated", error);
    throw error;
  }
};

/**
 * Updates module details by ID.
 *
 * @param id Module ID
 * @param data Module data to update
 * @returns True if the module was updated successfully, otherwise false
 */
export const updateModuleById = async (
  id: number,
  data: { name?: string; status?: "active" | "inactive" }
): Promise<boolean> => {
  try {
    if (data.name !== undefined && (await activeNameExists("module",data.name, id))) {
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

/**
 * Soft deletes a module by marking it as deleted.
 *
 * @param id Module ID
 * @returns True if the module was deleted successfully, otherwise false
 */
export const softDeleteModuleById = async (id: number): Promise<boolean> => {
  try {
    return await softDelete("module", id);
  } catch (error: unknown) {
    logServiceError("rbac.service", "softDeleteModuleById", error);
    throw error;
  }
}

/**
 * Creates a new module after validating duplicate name existence.
 *
 * @param name Module name
 * @returns Newly created module ID
 */
export const createModule = async (name: string): Promise<number> => {
  try {
    if (await activeNameExists("module",name)) {
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

/**
 * Fetches paginated roles list with optional search filtering.
 *
 * @param page Current page number
 * @param limit Number of records per page
 * @param search Optional search keyword for role name
 * @returns Paginated roles data
 */
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
       ORDER BY COALESCE(updated_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );
    return { items: rows, total, limit: safeLimit };
  } catch (error: unknown) {
    logServiceError("rbac.service", "getRolesPaginated", error);
    throw error;
  }
};

/**
 * Updates role details by ID.
 *
 * @param id Role ID
 * @param data Role data to update
 * @returns True if the role was updated successfully, otherwise false
 */
export const updateRoleById = async (
  id: number,
  data: { name?: string; status?: "active" | "inactive" }
): Promise<boolean> => {
  try {
    if (data.name !== undefined && (await activeNameExists("role",data.name, id))) {
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

/**
 * Soft deletes a role by marking it as deleted.
 *
 * @param id Role ID
 * @returns True if the role was deleted successfully, otherwise false
 */
export const softDeleteRoleById = async (id: number): Promise<boolean> => {
  try {
    return await softDelete("role", id);
  } catch (error: unknown) {
    logServiceError("rbac.service", "softDeleteRoleById", error);
    throw error;
  }
};

/**
 * Fetches role details by ID if the role is active and not deleted.
 *
 * @param id Role ID
 * @returns Role details or null if not found
 */
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

/**
 * Creates a new role after validating duplicate name existence.
 *
 * @param name Role name
 * @returns Newly created role ID
 */
export const createRole = async (name: string): Promise<number> => {
  try {
    if (await activeNameExists("role",name)) {
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

/**
 * Fetches permissions assigned to a specific role.
 *
 * @param roleId Role ID
 * @returns List of role permissions
 */
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

/**
 * Replaces existing permissions of a role with the provided permission set.
 *
 * @param roleId Role ID
 * @param permissions List of role permissions to assign
 * @returns Promise resolved when permissions are updated successfully
 */
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
 * Fetches active module permissions assigned to a specific role.
 *
 * @param roleId Role ID
 * @returns List of module permissions for the role
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