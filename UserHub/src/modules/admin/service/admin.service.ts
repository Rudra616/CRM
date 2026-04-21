import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";
import { RowDataPacket } from "mysql2";

// ─── Lookup ───────────────────────────────────────────────────────────────────
let Quary = `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, role_id, status`
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
      `SELECT COUNT(*) AS subadminCount FROM \`admin\` WHERE role = 'subadmin' AND status = 'active' AND COALESCE(is_delete, 0) = 0`
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
