import db from "../../../config/db";
import { Admin } from "../../../common/types/user";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findSubadminById = async (id: number): Promise<Admin | null> => {
  const [rows]: any = await db.query(
    `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, status
     FROM \`admin\` WHERE id = ? AND role = 'subadmin'`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const findSubadminByUsernameOrEmail = async (
  username: string,
  email: string
): Promise<Admin | null> => {
  // Check across entire admin table (admin + subadmin share username/email uniqueness)
  const [rows]: any = await db.query(
    "SELECT id FROM `admin` WHERE username = ? OR email = ?",
    [username, email]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const checkDuplicateSubadminUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  const [rows]: any = await db.query(
    "SELECT id FROM `admin` WHERE (username = ? OR email = ?) AND id != ?",
    [username, email, excludeId]
  );
  return rows.length > 0;
};

export const getAllSubadmins = async (): Promise<Admin[]> => {
  const [rows]: any = await db.query(
    `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, status
     FROM \`admin\` WHERE role = 'subadmin' ORDER BY id DESC`
  );
  return rows;
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
  await db.query(
    `UPDATE \`admin\`
     SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?
     WHERE id=? AND role='subadmin'`,
    [data.username, data.first_name, data.last_name, data.phone, data.email, data.gender ?? null, id]
  );
};

export const updateSubadminPassword = async (
  id: number,
  hashedPassword: string
): Promise<boolean> => {
  const [result]: any = await db.query(
    "UPDATE `admin` SET password = ? WHERE id = ? AND role = 'subadmin'",
    [hashedPassword, id]
  );
  return result.affectedRows > 0;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteSubadminById = async (id: number): Promise<boolean> => {
  const [result]: any = await db.query(
    "DELETE FROM `admin` WHERE id = ? AND role = 'subadmin'",
    [id]
  );
  return result.affectedRows > 0;
};
