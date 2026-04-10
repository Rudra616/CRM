import db from "../../config/db";
import { User } from "../../common/types/user";
import { logServiceError } from "../../common/helpers/serviceError";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findUserByUsernameOrEmail = async (
  username: string,
  email: string
): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE (username = ? OR email = ?) AND status != 'delete'",
      [username, email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByUsernameOrEmail", error);
    throw error;
  }
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, password, first_name, last_name, phone, email, gender, image_url, status
     FROM \`user\`
     WHERE username = ? AND status != 'delete'
     ORDER BY id DESC LIMIT 1`,
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByUsername", error);
    throw error;
  }
};

export const findUserById = async (id: number): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, image_url, status
     FROM \`user\` WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserById", error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, email FROM `user` WHERE email = ? AND status != 'delete' LIMIT 1",
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByEmail", error);
    throw error;
  }
};

export const checkDuplicateUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE (username = ? OR email = ?) AND id != ? AND status != 'delete'",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("user.service", "checkDuplicateUsernameOrEmail", error);
    throw error;
  }
};

// ─── Insert ───────────────────────────────────────────────────────────────────

export const insertUser = async (
  username: string,
  hashedPassword: string,
  first_name: string,
  last_name: string,
  phone: string,
  email: string,
  gender?: string | null,
  status: "pending" | "active" | "inactive" | "delete" = "pending"
): Promise<number> => {
  try {
    const [result]: any = await db.query(
      `INSERT INTO \`user\` (username, password, first_name, last_name, phone, email, gender, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, first_name, last_name, phone, email, gender ?? null, status]
    );
    return result.insertId;
  } catch (error: unknown) {
    logServiceError("user.service", "insertUser", error);
    throw error;
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateUserById = async (
  userId: number,
  data: {
    username: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    gender?: string | null;
    image_url?: string | null;
  }
): Promise<void> => {
  try {
    await db.query(
      `UPDATE \`user\`
     SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?, image_url=?
     WHERE id=?`,
      [
        data.username,
        data.first_name,
        data.last_name,
        data.phone,
        data.email,
        data.gender ?? null,
        data.image_url ?? null,
        userId,
      ]
    );
  } catch (error: unknown) {
    logServiceError("user.service", "updateUserById", error);
    throw error;
  }
};

export const updateUserPassword = async (
  userId: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `user` SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("user.service", "updateUserPassword", error);
    throw error;
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const softDeleteUser = async (userId: number): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE id = ? AND status != 'delete' LIMIT 1",
      [userId]
    );
    if (!rows.length) return false;
    await db.query("UPDATE `user` SET status = 'delete' WHERE id = ?", [userId]);
    return true;
  } catch (error: unknown) {
    logServiceError("user.service", "softDeleteUser", error);
    throw error;
  }
};
