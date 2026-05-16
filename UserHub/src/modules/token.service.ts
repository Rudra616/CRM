import db from "../config/db";
import { logServiceError } from "../common/helpers/serviceError";

/**
 * Creates or updates a user authentication token with 1-day expiry.
 *
 * @param userId User ID
 * @param username Username
 * @param token JWT token
 * @returns void
 */
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

/**
 * Retrieves a valid (non-expired) user token.
 *
 * @param token JWT token
 * @returns Token record or null if not found
 */
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

/**
 * Deletes a user authentication token.
 *
 * @param token JWT token
 * @returns void
 */
export const removeUserToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM user_token WHERE token = ?", [token]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeUserToken", error);
    throw error;
  }
};

/**
 * Deletes all authentication tokens for a specific user.
 *
 * @param userId User ID
 * @returns void
 */
export const removeAllUserTokensForUserId = async (userId: number): Promise<void> => {
  try {
    await db.query("DELETE FROM user_token WHERE user_id = ?", [userId]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAllUserTokensForUserId", error);
    throw error;
  }
};

/**
 * Checks if a user has any active (non-expired) authentication token.
 *
 * @param userId User ID
 * @returns True if active token exists, otherwise false
 */
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

/**
 * Creates or updates an admin authentication token with 1-day expiry.
 *
 * @param adminId Admin ID
 * @param username Username
 * @param token JWT token
 * @returns void
 */
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

/**
 * Retrieves a valid (non-expired) admin token.
 *
 * @param token JWT token
 * @returns Token record or null if not found
 */
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

/**
 * Deletes an admin authentication token.
 *
 * @param token JWT token
 * @returns void
 */
export const removeAdminToken = async (token: string): Promise<void> => {
  try {
    await db.query("DELETE FROM admin_token WHERE token = ?", [token]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAdminToken", error);
    throw error;
  }
};

/**
 * Deletes all authentication tokens for a specific admin.
 *
 * @param adminId Admin ID
 * @returns void
 */
export const removeAllAdminTokensForAdminId = async (adminId: number): Promise<void> => {
  try {
    await db.query("DELETE FROM admin_token WHERE admin_id = ?", [adminId]);
  } catch (error: unknown) {
    logServiceError("token.service", "removeAllAdminTokensForAdminId", error);
    throw error;
  }
};

/**
 * Checks if an admin has any active (non-expired) authentication token.
 *
 * @param adminId Admin ID
 * @returns True if active token exists, otherwise false
 */
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

/**
 * Invalidates all subadmin sessions belonging to a role (forces re-login after role/permission changes).
 *
 * @param roleId Role ID
 * @returns void
 */
export const invalidateSubadminSessionsForRoleId = async (roleId: number): Promise<void> => {
  try {
    await db.query(
      `DELETE at FROM admin_token AS at
       INNER JOIN \`admin\` AS a ON a.id = at.admin_id
       WHERE a.role_id = ?`,
      [roleId]
    );
  } catch (error: unknown) {
    logServiceError("token.service", "invalidateSubadminSessionsForRoleId", error);
  }
};

/**
 * Invalidates all subadmin sessions for roles that have access to a specific module.
 *
 * @param moduleId Module ID
 * @returns void
 */
export const invalidateSubadminSessionsForModuleId = async (moduleId: number): Promise<void> => {
  try {
    await db.query(
      `DELETE at FROM admin_token AS at
       INNER JOIN \`admin\` AS a ON a.id = at.admin_id
       INNER JOIN role_permission rp 
         ON rp.role_id = a.role_id AND rp.module_id = ?`,
      [moduleId]
    );
  } catch (error: unknown) {
    logServiceError("token.service", "invalidateSubadminSessionsForModuleId", error);
  }
};
