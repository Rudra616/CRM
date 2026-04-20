import db from "../../../config/db";
import { User } from "../../../common/types/user";
import { logServiceError } from "../../../common/helpers/serviceError";

// ─── Paginated list ───────────────────────────────────────────────────────────

/** Allowed `limit` query values for GET users list (shared with API response). */
export const USERS_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;

export const normalizeListPageLimit = (limit?: number) => {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return USERS_PAGE_SIZE_OPTIONS[0];
  return (USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : USERS_PAGE_SIZE_OPTIONS[0];
};

export const getUsersPaginated = async (
  page: number,
  limit: number,
  statusFilter?: string,
  search?: string,
  opts?: { deletedOnly?: boolean }
): Promise<{ items: User[]; total: number; limit: number }> => {
  try {
    const safeLimit = normalizeListPageLimit(limit);
    const offset = (page - 1) * safeLimit;
    const deletedOnly = Boolean(opts?.deletedOnly);

    let where = "WHERE 1=1";
    const whereParams: unknown[] = [];

    if (deletedOnly) {
      where += " AND COALESCE(is_delete, 0) = 1";
    } else {
      where += " AND COALESCE(is_delete, 0) = 0";
      if (statusFilter) {
        where += " AND status = ?";
        whereParams.push(statusFilter);
      }
    }

    if (search) {
      const like = `%${search}%`;
      where += ` AND (
        first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR email LIKE ? OR gender LIKE ?
      )`;
      whereParams.push(like, like, like, like, like);
    }

    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, image_url, status, is_delete
       FROM \`user\` ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, safeLimit, offset]
    );

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total FROM \`user\` ${where}`,
      whereParams
    );

    return {
      items: rows,
      total: Number(countRows?.[0]?.total ?? 0),
      limit: safeLimit,
    };
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
    if (!["active", "pending", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    await db.query(
      "UPDATE `user` SET status = ? WHERE id = ? AND COALESCE(is_delete, 0) = 0",
      [status, userId]
    );

    const [rows]: any = await db.query(
      `SELECT id, username, first_name, last_name, phone, email, gender, status, is_delete
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
     WHERE id=? AND COALESCE(is_delete, 0) = 0`,
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
      `SELECT id, username, first_name, last_name, phone, email, gender, status, is_delete
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
      "SELECT id FROM `user` WHERE id = ? AND COALESCE(is_delete, 0) = 0 LIMIT 1",
      [userId]
    );
    if (!rows.length) return false;

    await db.query("UPDATE `user` SET is_delete = 1 WHERE id = ?", [userId]);
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
      "SELECT id FROM `user` WHERE (username = ? OR email = ?) AND id != ? AND COALESCE(is_delete, 0) = 0",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("admin/user.service", "checkDuplicateUserUsernameOrEmail", error);
    throw error;
  }
};




// dynamic dropdown limit