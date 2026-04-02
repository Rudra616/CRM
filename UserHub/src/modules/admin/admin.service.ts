import db from "../../config/db";
import { User } from "../../common/types/user";

// Data access helpers for admin accounts and admin-facing views of user data.

export interface Admin {
  id: number;
  username: string;
  email: string;
  password: string;
  image_url?: string | null;
}

// ─── SELECT ───────────────────────────────────────────────────────────────────

export const findAdminByUsername = async (username: string): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM admin WHERE username = ?",
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findAdminByUsername:", error.message);
    throw error;
  }
};

export const findAdminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, email, image_url FROM admin WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findAdminById:", error.message);
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
      "SELECT id FROM admin WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: any) {
    console.error("Error in checkDuplicateAdminUsernameOrEmail:", error.message);
    throw error;
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateAdminById = async (
  adminId: number,
  username: string,
  email: string,
  imageUrl: string | null | undefined
): Promise<void> => {
  try {
    await db.query(
      "UPDATE admin SET username=?, email=?, image_url=? WHERE id=?",
      [username, email, imageUrl ?? null, adminId]
    );
  } catch (error: any) {
    console.error("Error in updateAdminById:", error.message);
    throw error;
  }
};




export const getAllUsersByRole = async (roleId: number): Promise<User[]> => {
  const [rows]: any = await db.query(
    `SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
     FROM users
     WHERE (role_id = ? OR role_id IS NULL)
       AND (status IS NULL OR status != 'delete')
     ORDER BY id DESC`,
    [roleId]
  );
  return rows;
};

export const updateUserStatus = async (
  userId: number,
  status: string
): Promise<User | null> => {
  // Validate status
  if (!["active", "pending", "inactive", "delete"].includes(status)) {
    throw new Error("Invalid status value");
  }

  await db.query(
    "UPDATE users SET status = ? WHERE id = ? AND (role_id = 3 OR role_id IS NULL) AND (status IS NULL OR status != 'delete')",
    [status, userId]
  );

  const [rows]: any = await db.query(
    `SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
     FROM users WHERE id = ?`,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
};

export const getUsersPaginatedByRole = async (
  roleId: number,
  page: number,
  limit: number
): Promise<{ items: User[]; total: number }> => {
  const offset = (page - 1) * limit;
  const [rows]: any = await db.query(
    `SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
     FROM users
     WHERE (role_id = ? OR role_id IS NULL)
       AND (status IS NULL OR status != 'delete')
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [roleId, limit, offset]
  );

  const [countRows]: any = await db.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE (role_id = ? OR role_id IS NULL)
       AND (status IS NULL OR status != 'delete')`,
    [roleId]
  );
  return { items: rows, total: Number(countRows?.[0]?.total ?? 0) };
};

export const updateUserProfileByAdmin = async (
  userId: number,
  data: {
    username: string;
    firstname: string;
    lastname: string;
    phone: string;
    email: string;
    gender: string;
    status: string;
  }
): Promise<User | null> => {
  await db.query(
    `UPDATE users
     SET username = ?, firstname = ?, lastname = ?, phone = ?, email = ?, gender = ?, status = ?
     WHERE id = ? AND (role_id = 3 OR role_id IS NULL) AND (status IS NULL OR status != 'delete')`,
    [data.username, data.firstname, data.lastname, data.phone, data.email, data.gender, data.status, userId]
  );

  const [rows]: any = await db.query(
    `SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const softDeleteUserByAdmin = async (userId: number): Promise<boolean> => {
  const [rows]: any = await db.query(
    `SELECT id, username, email
     FROM users
     WHERE id = ? AND (role_id = 3 OR role_id IS NULL) AND (status IS NULL OR status != 'delete')
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return false;

  const u = rows[0];
  const stamp = Date.now();
  const tombUsername = `${u.username}__deleted__${u.id}_${stamp}`;
  const tombEmail = `${u.email}__deleted__${u.id}_${stamp}`;
  await db.query(
    `UPDATE users SET status = 'delete', username = ?, email = ? WHERE id = ?`,
    [tombUsername, tombEmail, userId]
  );
  return true;
};

export const getAdminDashboardSummary = async (): Promise<{
  userCount: number;
  subadminCount: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  deletedUsers: number;
}> => {
  const [rows]: any = await db.query(`
    SELECT 
      COUNT(CASE WHEN (role_id = 3 OR role_id IS NULL) AND (status IS NULL OR status != 'delete') THEN 1 END) AS userCount,
      
      COUNT(CASE WHEN role_id = 2 AND (status IS NULL OR status != 'delete') THEN 1 END) AS subadminCount,

      COUNT(CASE WHEN status = 'active' THEN 1 END) AS activeUsers,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingUsers,
      COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactiveUsers,
      COUNT(CASE WHEN status = 'delete' THEN 1 END) AS deletedUsers

    FROM users
  `);

  return {
    userCount: Number(rows?.[0]?.userCount ?? 0),
    subadminCount: Number(rows?.[0]?.subadminCount ?? 0),
    activeUsers: Number(rows?.[0]?.activeUsers ?? 0),
    pendingUsers: Number(rows?.[0]?.pendingUsers ?? 0),
    inactiveUsers: Number(rows?.[0]?.inactiveUsers ?? 0),
    deletedUsers: Number(rows?.[0]?.deletedUsers ?? 0),
  };
};