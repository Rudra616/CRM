import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findSubadminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, status
     FROM \`admin\` WHERE id = ? AND role = 'subadmin'`,
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
      "SELECT id FROM `admin` WHERE username = ? OR email = ?",
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
      "SELECT id FROM `admin` WHERE (username = ? OR email = ?) AND id != ?",
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
      `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, status
     FROM \`admin\` WHERE role = 'subadmin' ORDER BY id DESC`
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "getAllSubadmins", error);
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
}): Promise<number> => {
  try {
    const [result]: any = await db.query(
      `INSERT INTO \`admin\`
       (username, password, first_name, last_name, phone, email, gender, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'subadmin', 'active')`,
      [
        data.username,
        data.password,
        data.first_name,
        data.last_name,
        data.phone,
        data.email,
        data.gender ?? null,
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
  }
): Promise<void> => {
  try {
    await db.query(
      `UPDATE \`admin\`
     SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?
     WHERE id=? AND role='subadmin'`,
      [data.username, data.first_name, data.last_name, data.phone, data.email, data.gender ?? null, id]
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
      "UPDATE `admin` SET password = ? WHERE id = ? AND role = 'subadmin'",
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
      "DELETE FROM `admin` WHERE id = ? AND role = 'subadmin'",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("subadmin.service", "deleteSubadminById", error);
    throw error;
  }
};
