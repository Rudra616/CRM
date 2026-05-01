import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";
import { normalizeListPageLimit } from "./user.service";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findAdminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT a.id, a.username, a.first_name, a.last_name, a.phone, a.email, a.gender, a.image_url,
              a.status, a.role_id, r.name AS role_name
       FROM \`admin\` a
       LEFT JOIN \`role\` r ON r.id = a.role_id
       WHERE a.id = ? AND COALESCE(a.is_delete, 0) = 0`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("admin.service", "findAdminById", error);
    throw error;
  }
};

export const findSubadminByUsernameOrEmail = async (
  username: string,
  email: string
): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `admin` WHERE (username = ? OR email = ?) AND COALESCE(is_delete, 0) = 0",
      [username, email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "findSubadminByUsernameOrEmail", error);
    throw error;
  }
};

export const checkDuplicateSubadminUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `admin` WHERE (username = ? OR email = ?) AND id != ? AND COALESCE(is_delete, 0) = 0",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "checkDuplicateSubadminUsernameOrEmail", error);
    throw error;
  }
};

export const getAllAdmins = async (): Promise<Admin[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, image_url,
              status, role_id
       FROM \`admin\`
       WHERE COALESCE(is_delete, 0) = 0
       ORDER BY id DESC`
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("admin.service", "getAllAdmins", error);
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
    logServiceError("subadmin.service", "getSubadminsPaginated", error);
    throw error;
  }
};

// ─── Insert ───────────────────────────────────────────────────────────────────

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
    logServiceError("subadmin.service", "insertSubadmin", error);
    throw error;
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

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
    logServiceError("subadmin.service", "updateSubadminById", error);
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
    logServiceError("subadmin.service", "updateSubadminPassword", error);
    throw error;
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteSubadminById = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `admin` SET is_delete = 1 WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "deleteSubadminById", error);
    throw error;
  }
};
