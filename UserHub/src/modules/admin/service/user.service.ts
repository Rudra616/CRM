import db from "../../../config/db";
import { User } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";

// ─── Paginated list ───────────────────────────────────────────────────────────

export const getUsersPaginated = async (
  page: number,
  limit: number,
  statusFilter?: string,
  search?: string
): Promise<{ items: User[]; total: number }> => {
  try {
    const offset = (page - 1) * limit;

    let query = `
    SELECT id, username, first_name, last_name, phone, email, gender, image_url, status
    FROM \`user\`
    WHERE 1=1
  `;
    const params: any[] = [];

    if (statusFilter) {
      query += " AND status = ?";
      params.push(statusFilter);
    }

    if (search) {
      query += `
      AND (
        first_name LIKE ? OR last_name LIKE ? OR
        username   LIKE ? OR email     LIKE ? OR
        gender     LIKE ?
      )
    `;
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows]: any = await db.query(query, params);

    let countQuery = "SELECT COUNT(*) AS total FROM `user` WHERE 1=1";
    const countParams: any[] = [];

    if (statusFilter) {
      countQuery += " AND status = ?";
      countParams.push(statusFilter);
    }

    if (search) {
      countQuery += `
      AND (
        first_name LIKE ? OR last_name LIKE ? OR
        username   LIKE ? OR email     LIKE ? OR
        gender     LIKE ?
      )
    `;
      const like = `%${search}%`;
      countParams.push(like, like, like, like, like);
    }

    const [countRows]: any = await db.query(countQuery, countParams);

    return { items: rows, total: Number(countRows?.[0]?.total ?? 0) };
  } catch (error: unknown) {
    logServiceError("admin/user.service", "getUsersPaginated", error);
    throw error;
  }
};

// ─── Status update ────────────────────────────────────────────────────────────

export const updateUserStatusService = async (
  userId: number,
  status: string
): Promise<User | null> => {
  try {
    if (!["active", "pending", "inactive", "delete"].includes(status)) {
      throw new Error("Invalid status value");
    }

    await db.query(
      "UPDATE `user` SET status = ? WHERE id = ? AND status != 'delete'",
      [status, userId]
    );

    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, status
     FROM \`user\` WHERE id = ?`,
      [userId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("admin/user.service", "updateUserStatusService", error);
    throw error;
  }
};

// ─── Full profile update by admin ─────────────────────────────────────────────

export const updateUserProfileByAdmin = async (
  userId: number,
  data: {
    username: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    gender?: string | null;
    status: string;
  }
): Promise<User | null> => {
  try {
    await db.query(
      `UPDATE \`user\`
     SET username=?, first_name=?, last_name=?, phone=?, email=?, gender=?, status=?
     WHERE id=?`,
      [
        data.username,
        data.first_name,
        data.last_name,
        data.phone,
        data.email,
        data.gender ?? null,
        data.status,
        userId,
      ]
    );

    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, status
     FROM \`user\` WHERE id = ?`,
      [userId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("admin/user.service", "updateUserProfileByAdmin", error);
    throw error;
  }
};

// ─── Soft delete ──────────────────────────────────────────────────────────────

export const softDeleteUserByAdmin = async (userId: number): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM `user` WHERE id = ? AND status != 'delete' LIMIT 1",
      [userId]
    );
    if (!rows.length) return false;

    await db.query("UPDATE `user` SET status = 'delete' WHERE id = ?", [userId]);
    return true;
  } catch (error: unknown) {
    logServiceError("admin/user.service", "softDeleteUserByAdmin", error);
    throw error;
  }
};

// ─── Duplicate check (for admin edits) ───────────────────────────────────────

export const checkDuplicateUserUsernameOrEmail = async (
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
    logServiceError("admin/user.service", "checkDuplicateUserUsernameOrEmail", error);
    throw error;
  }
};
