import db from "../config/db";

// ─── User Tokens ──────────────────────────────────────────────────────────────

export const upsertUserToken = async (
  userId: number,
  username: string,
  token: string
): Promise<void> => {
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
};

export const findUserToken = async (token: string): Promise<any | null> => {
  const [rows]: any = await db.query(
    "SELECT * FROM user_token WHERE token = ? AND expires_at > NOW()",
    [token]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const removeUserToken = async (token: string): Promise<void> => {
  await db.query("DELETE FROM user_token WHERE token = ?", [token]);
};

export const removeAllUserTokensForUserId = async (userId: number): Promise<void> => {
  await db.query("DELETE FROM user_token WHERE user_id = ?", [userId]);
};

export const hasActiveUserTokenForUserId = async (userId: number): Promise<boolean> => {
  const [rows]: any = await db.query(
    "SELECT id FROM user_token WHERE user_id = ? AND expires_at > NOW() LIMIT 1",
    [userId]
  );
  return rows.length > 0;
};

// ─── Admin Tokens (admin + subadmin) ─────────────────────────────────────────

export const upsertAdminToken = async (
  adminId: number,
  username: string,
  token: string
): Promise<void> => {
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
};

export const findAdminToken = async (token: string): Promise<any | null> => {
  const [rows]: any = await db.query(
    "SELECT * FROM admin_token WHERE token = ? AND expires_at > NOW()",
    [token]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const removeAdminToken = async (token: string): Promise<void> => {
  await db.query("DELETE FROM admin_token WHERE token = ?", [token]);
};

export const removeAllAdminTokensForAdminId = async (adminId: number): Promise<void> => {
  await db.query("DELETE FROM admin_token WHERE admin_id = ?", [adminId]);
};

export const hasActiveAdminTokenForAdminId = async (adminId: number): Promise<boolean> => {
  const [rows]: any = await db.query(
    "SELECT id FROM admin_token WHERE admin_id = ? AND expires_at > NOW() LIMIT 1",
    [adminId]
  );
  return rows.length > 0;
};
