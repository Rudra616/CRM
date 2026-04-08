import db from "../../../config/db";
import { Admin } from "../../../common/types/user";
import { AdminRole } from "../../../common/types/role";

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const findAdminByUsername = async (username: string): Promise<Admin | null> => {
  const [rows]: any = await db.query(
    "SELECT * FROM `admin` WHERE username = ? AND status = 'active'",
    [username]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const findAdminById = async (id: number): Promise<Admin | null> => {
  const [rows]: any = await db.query(
    `SELECT id, username, first_name, last_name, phone, email, gender, image_url, role, status
     FROM \`admin\` WHERE id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const checkDuplicateAdminUsernameOrEmail = async (
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

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const getAdminDashboardSummary = async (): Promise<{
  userCount: number;
  subadminCount: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  deletedUsers: number;
}> => {
  const [[userRow]]: any = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'active')   AS activeUsers,
       SUM(status = 'pending')  AS pendingUsers,
       SUM(status = 'inactive') AS inactiveUsers,
       SUM(status = 'delete')   AS deletedUsers
     FROM \`user\``
  );

  const [[subRow]]: any = await db.query(
    "SELECT COUNT(*) AS subadminCount FROM `admin` WHERE role = 'subadmin' AND status = 'active'"
  );

  return {
    userCount:      Number(userRow?.total         ?? 0),
    subadminCount:  Number(subRow?.subadminCount  ?? 0),
    activeUsers:    Number(userRow?.activeUsers   ?? 0),
    pendingUsers:   Number(userRow?.pendingUsers  ?? 0),
    inactiveUsers:  Number(userRow?.inactiveUsers ?? 0),
    deletedUsers:   Number(userRow?.deletedUsers  ?? 0),
  };
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
  const fields: string[] = [];
  const params: any[]    = [];

  if (data.username   !== undefined) { fields.push("username = ?");   params.push(data.username); }
  if (data.email      !== undefined) { fields.push("email = ?");      params.push(data.email); }
  if (data.first_name !== undefined) { fields.push("first_name = ?"); params.push(data.first_name); }
  if (data.last_name  !== undefined) { fields.push("last_name = ?");  params.push(data.last_name); }
  if (data.phone      !== undefined) { fields.push("phone = ?");      params.push(data.phone); }
  if (data.gender     !== undefined) { fields.push("gender = ?");     params.push(data.gender); }
  if (data.image_url  !== undefined) { fields.push("image_url = ?");  params.push(data.image_url); }

  if (!fields.length) return;
  params.push(adminId);
  await db.query(`UPDATE \`admin\` SET ${fields.join(", ")} WHERE id = ?`, params);
};

export const updateAdminPassword = async (
  adminId: number,
  hashedPassword: string
): Promise<boolean> => {
  const [result]: any = await db.query(
    "UPDATE `admin` SET password = ? WHERE id = ?",
    [hashedPassword, adminId]
  );
  return result.affectedRows > 0;
};
