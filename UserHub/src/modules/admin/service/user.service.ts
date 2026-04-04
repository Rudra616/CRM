import db from "../../../config/db";
import { User } from "../../../common/types/user";

// Data access helpers for admin accounts and admin-facing views of user data.

export interface Admin {
  id: number;
  username: string;
  email: string;
  password: string;
  image_url?: string | null;
}


// update status
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

// get user by pagination
export const getUsersPaginatedByRole = async (
  roleId: number,
  page: number,
  limit: number,
  statusFilter?: string
): Promise<{ items: User[]; total: number }> => {
  const offset = (page - 1) * limit;

  let query = `
    SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
    FROM users
    WHERE (role_id = ? OR role_id IS NULL)
  `;

  const params: any[] = [roleId];

  // ✅ Only filter if explicitly provided
  if (statusFilter) {
    query += " AND status = ?";
    params.push(statusFilter);
  }

  query += " ORDER BY id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows]: any = await db.query(query, params);

  // Count total
  let countQuery = `
    SELECT COUNT(*) AS total 
    FROM users 
    WHERE (role_id = ? OR role_id IS NULL)
  `;

  const countParams: any[] = [roleId];

  // ✅ Same logic for count
  if (statusFilter) {
    countQuery += " AND status = ?";
    countParams.push(statusFilter);
  }

  const [countRows]: any = await db.query(countQuery, countParams);

  return { items: rows, total: Number(countRows?.[0]?.total ?? 0) };
};

// update user by admin
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
     WHERE id = ? AND (role_id = 3 OR role_id IS NULL)`,
    [data.username, data.firstname, data.lastname, data.phone, data.email, data.gender, data.status, userId]
  );

  const [rows]: any = await db.query(
    `SELECT id, username, firstname, lastname, phone, email, gender, role_id, status
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

// soft delete user
export const softDeleteUserByAdmin = async (userId: number): Promise<boolean> => {
  // Find the user who is not already deleted
  const [rows]: any = await db.query(
    `SELECT id
     FROM users
     WHERE id = ? AND (role_id = 3 OR role_id IS NULL) AND (status IS NULL OR status != 'delete')
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) return false; // User not found or already deleted

  // Mark the user as deleted
  await db.query(
    `UPDATE users SET status = 'delete' WHERE id = ?`,
    [userId]
  );

  return true;
};

