import db from "../config/db";
import { logServiceError } from "../common/helpers/serviceError";

// ─── User Tokens ──────────────────────────────────────────────────────────────

export const upsertUserToken = async (
  userId: number,
  username: string,
  token: string
): Promise<void> => {
  try {
    const [existing]: any = await db.query(
      "SELECT id FROM user_token WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE user_token SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE user_id=?",
        [token, userId]
      );
    } else {
      await db.query(
        "INSERT INTO user_token (user_id, username, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))",
        [userId, username, token]
      );
    }
  } catch (error: unknown) {
    logServiceError("token.service", "upsertUserToken", error);
    throw error;
  }
};

export const findUserToken = async (token: string): Promise<any | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM user_token WHERE token = ? AND expires_at > NOW()",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("token.service", "findUserToken", error);
    throw error;
  }
};

export const removeUserToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM user_token WHERE token = ?", [token]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeUserToken", error);
    throw error;
  }
};

export const removeAllUserTokensForUserId = async (userId: number): Promise<void> => {
  try {
    await db.query("DELETE FROM user_token WHERE user_id = ?", [userId]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAllUserTokensForUserId", error);
    throw error;
  }
};

export const hasActiveUserTokenForUserId = async (userId: number): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM user_token WHERE user_id = ? AND expires_at > NOW() LIMIT 1",
      [userId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("token.service", "hasActiveUserTokenForUserId", error);
    throw error;
  }
};

// ─── Admin Tokens (admin + subadmin) ─────────────────────────────────────────

export const upsertAdminToken = async (
  adminId: number,
  username: string,
  token: string
): Promise<void> => {
  try {
    const [existing]: any = await db.query(
      "SELECT id FROM admin_token WHERE admin_id = ?",
      [adminId]
    );

    if (existing.length > 0) {
      await db.query(
        "UPDATE admin_token SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE admin_id=?",
        [token, adminId]
      );
    } else {
      await db.query(
        "INSERT INTO admin_token (admin_id, username, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))",
        [adminId, username, token]
      );
    }
  } catch (error: unknown) {
    logServiceError("token.service", "upsertAdminToken", error);
    throw error;
  }
};

export const findAdminToken = async (token: string): Promise<any | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM admin_token WHERE token = ? AND expires_at > NOW()",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: unknown) {
    logServiceError("token.service", "findAdminToken", error);
    throw error;
  }
};

export const removeAdminToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM admin_token WHERE token = ?", [token]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAdminToken", error);
    throw error;
  }
};

export const removeAllAdminTokensForAdminId = async (adminId: number): Promise<void> => {
  try {
    await db.query("DELETE FROM admin_token WHERE admin_id = ?", [adminId]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAllAdminTokensForAdminId", error);
    throw error;
  }
};

export const hasActiveAdminTokenForAdminId = async (adminId: number): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM admin_token WHERE admin_id = ? AND expires_at > NOW() LIMIT 1",
      [adminId]
    );
    return rows.length > 0;
  } catch (error: unknown) {
    logServiceError("token.service", "hasActiveAdminTokenForAdminId", error);
    throw error;
  }
};

/** After role / permission matrix edits: force subadmins on this role to sign in again. */
export const invalidateSubadminSessionsForRoleId = async (roleId: number): Promise<void> => {
  try {
    await db.query(
      `DELETE at FROM admin_token AS at
       INNER JOIN \`admin\` AS a ON a.id = at.admin_id
       WHERE a.role = 'subadmin' AND a.role_id = ?`,
      [roleId]
    );
  } catch (error: unknown) {
    logServiceError("token.service", "invalidateSubadminSessionsForRoleId", error);
  }
};

/** After module edits: force subadmins whose role_permission row references this module to sign in again. */
export const invalidateSubadminSessionsForModuleId = async (moduleId: number): Promise<void> => {
  try {
    await db.query(
      `DELETE at FROM admin_token AS at
       INNER JOIN \`admin\` AS a ON a.id = at.admin_id
       INNER JOIN role_permission rp ON rp.role_id = a.role_id AND rp.module_id = ?
       WHERE a.role = 'subadmin'`,
      [moduleId]
    );
  } catch (error: unknown) {
    logServiceError("token.service", "invalidateSubadminSessionsForModuleId", error);
  }
};
