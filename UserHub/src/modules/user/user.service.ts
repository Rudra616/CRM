import db from "../../config/db";
import { User } from "../../common/types/user";
import { logServiceError } from "../../common/helpers/serviceError";
import { checkDuplicate } from "../../common/helpers/service.helper";
// ─── Lookup ───────────────────────────────────────────────────────────────────
let Quary = "SELECT id, username, password, first_name, last_name, phone, email, gender, image_url, status, is_delete";
/**
 * Fetches a user by username or email to check duplicates during registration.
 *
 * @param username Username to check
 * @param email Email to check
 * @returns List of matching users (id, username, email)
 */
export const findUserByUsernameOrEmail = async (
  username: string,
  email: string
): Promise<boolean> => {
  try {
    return await checkDuplicate("user", { username, email });
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByUsernameOrEmail", error);
    throw error;
  }
};

export const existsByFields = async (
  table: "user" | "admin",
  fields: Record<string, any>
): Promise<boolean> => {
  return await checkDuplicate(table, fields);
};
/**
 * Fetches a user by username (active only).
 *
 * @param username Username
 * @returns User data or null if not found
 */
export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      `${Quary}
     FROM \`user\`
     WHERE username = ? AND COALESCE(is_delete, 0) = 0
     ORDER BY id DESC LIMIT 1`,
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByUsername", error);
    throw error;
  }
};

/**
 * Fetches a user by ID (active only).
 *
 * @param id User ID
 * @returns User data or null if not found
 */
export const findUserById = async (id: number): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      `${Quary}
     FROM \`user\` WHERE id = ? AND COALESCE(is_delete, 0) = 0`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserById", error);
    throw error;
  }
};

/**
 * Fetches a user by email (active only).
 *
 * @param email User email
 * @returns User data or null if not found
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, email FROM `user` WHERE email = ? AND COALESCE(is_delete, 0) = 0 LIMIT 1",
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("user.service", "findUserByEmail", error);
    throw error;
  }
};

/**
 * Checks if a username or email already exists for another user.
 *
 * @param username Username to check
 * @param email Email to check
 * @param excludeId User ID to exclude from check
 * @returns True if duplicate exists, otherwise false
 */
export const checkDuplicateUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE (username = ? OR email = ?) AND id != ? AND COALESCE(is_delete, 0) = 0",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("user.service", "checkDuplicateUsernameOrEmail", error);
    throw error;
  }
};

/**
 * Creates a new user with hashed password and optional gender/status.
 *
 * @param username Username
 * @param hashedPassword Encrypted password
 * @param first_name First name
 * @param last_name Last name
 * @param phone Phone number
 * @param email Email address
 * @param gender Optional gender
 * @param status Account status (default: pending)
 * @returns Newly created user ID
 */
export const insertUser = async (
  username: string,
  hashedPassword: string,
  first_name: string,
  last_name: string,
  phone: string,
  email: string,
  gender?: string | null,
  status: "pending" | "active" | "inactive" = "pending"
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

/**
 * Updates user profile information including optional image.
 *
 * @param userId User ID
 * @param data User profile fields to update
 * @returns void
 */
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
     WHERE id=? AND COALESCE(is_delete, 0) = 0`,
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

/**
 * Updates a user's password.
 *
 * @param userId User ID
 * @param hashedPassword New hashed password
 * @returns True if update was successful, otherwise false
 */
export const updateUserPassword = async (
  userId: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `user` SET password = ? WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("user.service", "updateUserPassword", error);
    throw error;
  }
};

/**
 * Soft deletes a user by marking the account as deleted.
 *
 * @param userId User ID
 * @returns True if user was deleted successfully, otherwise false
 */
export const softDeleteUser = async (userId: number): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE id = ? AND COALESCE(is_delete, 0) = 0 LIMIT 1",
      [userId]
    );
    if (!rows.length) return false;
    await db.query("UPDATE `user` SET is_delete = 1 WHERE id = ?", [userId]);
    return true;
  } catch (error: unknown) {
    logServiceError("user.service", "softDeleteUser", error);
    throw error;
  }
};
