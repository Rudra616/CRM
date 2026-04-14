import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findSubadminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT a.id, a.username, a.first_name, a.last_name, a.phone, a.email, a.gender, a.image_url,
            a.role, a.status, a.role_id, r.name AS role_name
     FROM \`admin\` a
     LEFT JOIN role r ON r.id = a.role_id AND COALESCE(r.is_delete, 0) = 0
     WHERE a.id = ? AND a.role = 'subadmin' AND COALESCE(a.is_delete, 0) = 0`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "findSubadminById", error);
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

export const getAllSubadmins = async (): Promise<Admin[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT a.id, a.username, a.first_name, a.last_name, a.phone, a.email, a.gender, a.image_url,
            a.role, a.status, a.role_id, r.name AS role_name
     FROM \`admin\` a
     LEFT JOIN role r ON r.id = a.role_id AND COALESCE(r.is_delete, 0) = 0
     WHERE a.role = 'subadmin' AND COALESCE(a.is_delete, 0) = 0
     ORDER BY a.id DESC`
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "getAllSubadmins", error);
    throw error;
  }
};

export const getSubadminsPaginated = async (
  page: number,
  limit: number,
  search?: string
): Promise<{ items: Admin[]; total: number }> => {
  try {
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.id, a.username, a.first_name, a.last_name, a.phone, a.email, a.gender, a.image_url,
             a.role, a.status, a.role_id, r.name AS role_name
      FROM \`admin\` a
      LEFT JOIN role r ON r.id = a.role_id AND COALESCE(r.is_delete, 0) = 0
      WHERE a.role = 'subadmin' AND COALESCE(a.is_delete, 0) = 0
    `;
    const params: any[] = [];

    if (search) {
      query += `
        AND (
          a.first_name LIKE ? OR a.last_name LIKE ? OR
          a.username LIKE ? OR a.email LIKE ? OR a.phone LIKE ? OR a.gender LIKE ? OR r.name LIKE ?
        )
      `;
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
    }

    query += " ORDER BY a.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const [rows]: any = await db.query(query, params);

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM \`admin\` a
      LEFT JOIN role r ON r.id = a.role_id AND COALESCE(r.is_delete, 0) = 0
      WHERE a.role = 'subadmin' AND COALESCE(a.is_delete, 0) = 0
    `;
    const countParams: any[] = [];
    if (search) {
      countQuery += `
        AND (
          a.first_name LIKE ? OR a.last_name LIKE ? OR
          a.username LIKE ? OR a.email LIKE ? OR a.phone LIKE ? OR a.gender LIKE ? OR r.name LIKE ?
        )
      `;
      const like = `%${search}%`;
      countParams.push(like, like, like, like, like, like, like);
    }
    const [countRows]: any = await db.query(countQuery, countParams);
    return { items: rows, total: Number(countRows?.[0]?.total ?? 0) };
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
    const [result]: any = await db.query(
      `INSERT INTO \`admin\`
       (username, password, first_name, last_name, phone, email, gender, role, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'subadmin', ?, 'active')`,
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
    if (data.role_id !== undefined) {
      await db.query(
        `UPDATE \`admin\`
       SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?, role_id=?
       WHERE id=? AND role='subadmin' AND COALESCE(is_delete, 0) = 0`,
        [
          data.username,
          data.first_name,
          data.last_name,
          data.phone,
          data.email,
          data.gender ?? null,
          data.role_id,
          id,
        ]
      );
    } else {
      await db.query(
        `UPDATE \`admin\`
       SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?
       WHERE id=? AND role='subadmin' AND COALESCE(is_delete, 0) = 0`,
        [data.username, data.first_name, data.last_name, data.phone, data.email, data.gender ?? null, id]
      );
    }
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
      "UPDATE `admin` SET password = ? WHERE id = ? AND role = 'subadmin' AND COALESCE(is_delete, 0) = 0",
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
      "UPDATE `admin` SET is_delete = 1 WHERE id = ? AND role = 'subadmin' AND COALESCE(is_delete, 0) = 0",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "deleteSubadminById", error);
    throw error;
  }
};
