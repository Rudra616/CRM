import db from "../../config/db";
import { User, RegisterUserDTO, UpdateProfileDTO } from "../../common/types/user";

// Data access helpers for user records (lookup, registration, profile updates, and soft deletes).

// ─── SELECT ───────────────────────────────────────────────────────────────────

export const findUserByUsernameOrEmail = async (
  username: string,
  email: string
): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND (status IS NULL OR status != 'delete')",
      [username, email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserByUsernameOrEmail:", error.message);
    throw error;
  }
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, password, firstname, lastname, email, role_id, gender, status FROM users WHERE username = ? AND (status IS NULL OR status != 'delete') ORDER BY id DESC LIMIT 1",
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserByUsername:", error.message);
    throw error;
  }
};

export const findUserById = async (id: number): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, firstname, lastname, phone, email, role_id, image_url, gender,status FROM users WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserById:", error.message);
    throw error;
  }
};

export const findUserByIdAndRole = async (
  id: number,
  roleId: number
): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, firstname, lastname, phone, email, gender,status FROM users WHERE id = ? AND role_id = ?",
      [id, roleId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserByIdAndRole:", error.message);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserByEmail:", error.message);
    throw error;
  }
};

export const findAllByRole = async (roleId: number): Promise<User[]> => {
  const [rows]: any = await db.query(
    "SELECT id, username, firstname, lastname, phone, email, gender, status FROM users WHERE role_id = ? AND (status IS NULL OR status != 'delete')",
    [roleId]
  );
  return rows;
};

export const checkDuplicateUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ? AND (status IS NULL OR status != 'delete')",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: any) {
    console.error("Error in checkDuplicateUsernameOrEmail:", error.message);
    throw error;
  }
};

// ─── INSERT ───────────────────────────────────────────────────────────────────

export const insertUser = async (
  username: string,
  hashedPassword: string,
  firstname: string,
  lastname: string,
  phone: string,
  email: string,
  roleId: number,
  gender?: string,
  status: 'pending' | 'active' | 'inactive' | 'delete' = 'pending'

): Promise<number> => {
  try {
    const [result]: any = await db.query(
      "INSERT INTO users (username,password,firstname,lastname,phone,email,role_id,gender,status) VALUES (?,?,?,?,?,?,?,?,?)",
      [username, hashedPassword, firstname, lastname, phone, email, roleId, gender ?? null,status]
    );

    return result.insertId;
  } catch (error: any) {
    console.error("Error in insertUser:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("Username or email already exists");
    }

    throw error;
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateUserById = async (
  userId: number,
  username: string,
  firstname: string,
  lastname: string,
  phone: string,
  email: string,
  imageUrl: string | undefined | null,
  gender: string | undefined,
  hashedPassword?: string
): Promise<void> => {
  try {
    if (hashedPassword) {
      await db.query(
        "UPDATE users SET username=?, firstname=?, lastname=?, phone=?, email=?, password=?, image_url=?, gender=? WHERE id=?",
        [username, firstname, lastname, phone, email, hashedPassword, imageUrl ?? null, gender ?? null, userId]
      );
    } else {
      await db.query(
        "UPDATE users SET username=?, firstname=?, lastname=?, phone=?, email=?, image_url=?, gender=? WHERE id=?",
        [username, firstname, lastname, phone, email, imageUrl ?? null, gender ?? null, userId]
      );
    }
  } catch (error: any) {
    console.error("Error in updateUserById:", error.message);
    throw error;
  }
};

export const updateUserPassword = async (
  userId: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  } catch (error: any) {
    console.error("Error in updateUserPassword:", error.message);
    throw error;
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteUserByIdAndRole = async (id: number, roleId: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "DELETE FROM users WHERE id = ? AND role_id = ?",
      [id, roleId]
    );

    return result.affectedRows > 0;
  } catch (error: any) {
    console.error("Error in deleteUserByIdAndRole:", error.message);
    throw error;
  }
};


// NOTE: user_sessions table is no longer used by the application; session invalidation
// is handled solely via user_tokens / admin_tokens and cookie deletion.
