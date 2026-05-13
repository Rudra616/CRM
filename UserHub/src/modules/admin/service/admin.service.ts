import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";
import { RowDataPacket } from "mysql2";
import { normalizeListPageLimit } from "./user.service";

// ─── Lookup ───────────────────────────────────────────────────────────────────
let Quary = `SELECT id, username, first_name, last_name, phone, email, gender, image_url,role_id, status`
export const findAdminByUsername = async (username: string): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      `${Quary},password FROM \`admin\` WHERE username = ? AND status = 'active' AND COALESCE(is_delete, 0) = 0`,
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("admin.service", "findAdminByUsername", error);
    throw error;
  }
};

export const findAdminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      `${Quary}  FROM \`admin\` WHERE id = ? AND COALESCE(is_delete, 0) = 0`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("admin.service", "findAdminById", error);
    throw error;
  }
};

/** Active admin ids for socket fan-out (each admin only in `user:${id}`, no shared `staff` room). */
export const getActiveAdminIds = async (): Promise<number[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id FROM \`admin\` WHERE status = 'active' AND COALESCE(is_delete, 0) = 0`
    );
    return Array.isArray(rows) ? rows.map((r: { id: number }) => Number(r.id)) : [];
  } catch (error: unknown) {
    logServiceError("admin.service", "getActiveAdminIds", error);
    throw error;
  }
};

export const checkDuplicateAdminUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id FROM \`admin\` WHERE (username = ? OR email = ?) AND id != ? AND COALESCE(is_delete, 0) = 0`,
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("admin.service", "checkDuplicateAdminUsernameOrEmail", error);
    throw error;
  }
};

const subadminListFrom = `FROM \`admin\` a
LEFT JOIN \`role\` r ON r.id = a.role_id`;
export const getSubadminsPaginated = async (
  page: number,
  limit: number,
  search?: string
): Promise<{ items: Admin[]; total: number; limit: number }> => {
  try {
    const safeLimit = normalizeListPageLimit(limit);
    const offset = (Math.max(1, page) - 1) * safeLimit;

    let where = "WHERE COALESCE(a.is_delete, 0) = 0";
    const whereParams: unknown[] = [];

    if (search && search.trim() !== "") {
      const like = `%${search.trim()}%`;
      where += ` AND (
        a.first_name LIKE ? OR a.last_name LIKE ? OR a.username LIKE ? OR
        a.email LIKE ? OR a.phone LIKE ? OR a.gender LIKE ?
      )`;
      whereParams.push(like, like, like, like, like, like);
    }

    const [rows]: any = await db.query(
      `SELECT a.id, a.username, a.first_name, a.last_name, a.phone, a.email, a.gender, a.image_url,
              a.status, a.role_id, r.name AS role_name
       ${subadminListFrom}
       ${where}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, safeLimit, offset]
    );

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total ${subadminListFrom} ${where}`,
      whereParams
    );

    return {
      items: rows,
      total: Number(countRows?.[0]?.total ?? 0),
      limit: safeLimit,
    };
  } catch (error: unknown) {
    logServiceError("admin.service", "getSubadminsPaginated", error);
    throw error;
  }
};

export const insertSubadmin = async (data: {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: string | null;
  role_id: number;
}): Promise<number> => {
  try {
    await db.query(
      `UPDATE \`admin\`
       SET username = CONCAT(username, '_deleted_', id),
           email = CONCAT(id, '_deleted_', email)
       WHERE (username = ? OR email = ?)
         AND COALESCE(is_delete, 0) = 1`,
      [data.username, data.email]
    );

    const [result]: any = await db.query(
      `INSERT INTO \`admin\`
       (username, password, first_name, last_name, phone, email, gender, role_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        data.username,
        data.password,
        data.first_name,
        data.last_name,
        data.phone,
        data.email,
        data.gender ?? null,
        data.role_id,
      ]
    );
    return result.insertId;
  } catch (error: unknown) {
    logServiceError("admin.service", "insertSubadmin", error);
    throw error;
  }
};

export const updateSubadminById = async (
  id: number,
  data: {
    username: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    gender?: string | null;
    role_id?: number;
  }
): Promise<void> => {
  try {
    const sets = [
      "username=?",
      "first_name=?",
      "last_name=?",
      "phone=?",
      "email=?",
      "gender=?",
    ];
    const vals: unknown[] = [
      data.username,
      data.first_name,
      data.last_name,
      data.phone,
      data.email,
      data.gender ?? null,
    ];
    if (data.role_id !== undefined) {
      sets.push("role_id=?");
      vals.push(data.role_id);
    }
    vals.push(id);
    await db.query(
      `UPDATE \`admin\`
       SET ${sets.join(", ")}
       WHERE id=? AND COALESCE(is_delete, 0) = 0`,
      vals
    );
  } catch (error: unknown) {
    logServiceError("admin.service", "updateSubadminById", error);
    throw error;
  }
};

export const updateSubadminPassword = async (
  id: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `admin` SET password = ? WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("admin.service", "updateSubadminPassword", error);
    throw error;
  }
};

export const deleteSubadminById = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `admin` SET is_delete = 1 WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("admin.service", "deleteSubadminById", error);
    throw error;
  }
};

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const getAdminDashboardSummary = async (): Promise<{
  userCount: number;
  subadminCount: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  deletedUsers: number;
}> => {
  try {
    // const [[userRow]]: any = await db.query(
    //   `SELECT
    //    SUM(COALESCE(is_delete, 0) = 0) AS total,
    //    SUM(COALESCE(is_delete, 0) = 0 AND status = 'active')   AS activeUsers,
    //    SUM(COALESCE(is_delete, 0) = 0 AND status = 'pending')  AS pendingUsers,
    //    SUM(COALESCE(is_delete, 0) = 0 AND status = 'inactive') AS inactiveUsers,
    //    SUM(COALESCE(is_delete, 0) = 1) AS deletedUsers
    //  FROM \`user\``
    // );

    const [[subRow]]: any = await db.query(
      `SELECT COUNT(*) AS subadminCount FROM \`admin\` WHERE status = 'active' AND COALESCE(is_delete, 0) = 0`
    );
    const [result] = await db.query<RowDataPacket[]>("SELECT * FROM user");
    const activeUsers = result.filter(user => user.status === 'active').length;
    const pendingUsers = result.filter(user => user.status === 'pending').length;
    const inactiveUsers = result.filter(user => user.status === 'inactive').length;
    const deletedUsers = result.filter(user => user.is_delete).length;


    return {
      userCount: result.length,
      subadminCount: subRow.subadminCount,
      activeUsers,
      pendingUsers,
      inactiveUsers,
      deletedUsers,
    };
  } catch (error: unknown) {
    logServiceError("admin.service", "getAdminDashboardSummary", error);
    throw error;
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateAdminProfileService = async (
  adminId: number,
  data: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    gender?: string | null;
    image_url?: string | null;
  }
): Promise<void> => {
  try {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.username !== undefined) { fields.push("username = ?"); params.push(data.username); }
    if (data.email !== undefined) { fields.push("email = ?"); params.push(data.email); }
    if (data.first_name !== undefined) { fields.push("first_name = ?"); params.push(data.first_name); }
    if (data.last_name !== undefined) { fields.push("last_name = ?"); params.push(data.last_name); }
    if (data.phone !== undefined) { fields.push("phone = ?"); params.push(data.phone); }
    if (data.gender !== undefined) { fields.push("gender = ?"); params.push(data.gender); }
    if (data.image_url !== undefined) { fields.push("image_url = ?"); params.push(data.image_url); }

    if (!fields.length) return;
    params.push(adminId);
    await db.query(`UPDATE \`admin\` SET ${fields.join(", ")} WHERE id = ?`, params);
  } catch (error: unknown) {
    logServiceError("admin.service", "updateAdminProfileService", error);
    throw error;
  }
};

export const updateAdminPassword = async (
  adminId: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      `UPDATE \`admin\` SET password = ? WHERE id = ?`,
      [hashedPassword, adminId]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("admin.service", "updateAdminPassword", error);
    throw error;
  }
};
