import db from "../config/db";

// ─── User Tokens ──────────────────────────────────────────────────────────────

export const upsertUserToken = async (
  userId: number,
  username: string,
  roleId: number,
  token: string
): Promise<void> => {
  try {
    const [existing]: any = await db.query(
      "SELECT id FROM user_tokens WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE user_tokens SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE user_id=?",
        [token, userId]
      );
    } else {
      await db.query(
        "INSERT INTO user_tokens (user_id, username, role_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())",
        [userId, username, roleId, token]
      );
    }
  } catch (error: any) {
    console.error("Error in upsertUserToken:", error.message);
    throw error;
  }
};

export const findUserToken = async (token: string): Promise<any | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM user_tokens WHERE token = ?",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findUserToken:", error.message);
    throw error;
  }
};

export const removeUserToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM user_tokens WHERE token = ?", [token]);
  } catch (error: any) {
    console.error("Error in removeUserToken:", error.message);
    throw error;
  }
};

// ─── Admin Tokens ─────────────────────────────────────────────────────────────

export const upsertAdminToken = async (
  adminId: number,
  username: string,
  token: string
): Promise<void> => {
  try {
    const [existing]: any = await db.query(
      "SELECT id FROM admin_tokens WHERE admin_id = ?",
      [adminId]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE admin_tokens SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE admin_id=?",
        [token, adminId]
      );
    } else {
      await db.query(
        "INSERT INTO admin_tokens (admin_id, username, role_id, token, expires_at, created_at, updated_at) VALUES (?, ?, 1, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())",
        [adminId, username, token]
      );
    }
  } catch (error: any) {
    console.error("Error in upsertAdminToken:", error.message);
    throw error;
  }
};

export const findAdminToken = async (token: string): Promise<any | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM admin_tokens WHERE token = ?",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findAdminToken:", error.message);
    throw error;
  }
};

export const removeAdminToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM admin_tokens WHERE token = ?", [token]);
  } catch (error: any) {
    console.error("Error in removeAdminToken:", error.message);
    throw error;
  }
};