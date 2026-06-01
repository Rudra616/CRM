import db from "../../config/db";
import { hashPassword } from "../../common/helpers/common.helper";
import type { BulkImportUser } from "./bulk_import.types";

/**
 * SQL query to find an existing user by username or email.
 */
const FIND_USER_SQL = `
  SELECT id FROM user
  WHERE (username = ? OR email = ?)
    AND is_delete = 0
  LIMIT 1
`;

/**
 * SQL fragment used for updating user profile fields.
 */
const PROFILE_SET_SQL = `
  first_name = ?,
  last_name = ?,
  phone = ?,
  gender = ?,
  image_url = ?,
  status = ?,
  is_delete = ?
`;

/**
 * Builds parameter array for user profile insert/update queries.
 *
 * @param user Bulk import user payload
 * @returns Ordered SQL parameter array
 */
const profileParams = (user: BulkImportUser) => [
  user.first_name,
  user.last_name,
  user.phone,
  user.gender,
  user.image_url,
  user.status,
  user.is_delete,
];
/*
 * Inserts or updates a user during bulk import.
 *
 * If the user already exists (matched by username or email),
 * only profile-related fields are updated.
 *
 * Username, email, and password remain unchanged on updates.
 * For new users, a default password is generated using:
 * `${username}_123`
 *
 * @param user Bulk import user payload
 * @returns Promise resolving when import operation completes
 */
export const importUser = async (user: BulkImportUser): Promise<void> => {
  const [existing]: any = await db.query(FIND_USER_SQL, [user.username, user.email]);

  if (existing.length > 0) {
    await db.query(
      `UPDATE user SET ${PROFILE_SET_SQL}, updated_at = NOW() WHERE id = ?`,
      [...profileParams(user), existing[0].id]
    );
    return;
  }

  const password = await hashPassword(`${user.username}_123`);

  await db.query(
    `INSERT INTO user (
      username, password, first_name, last_name, phone, email,
      gender, image_url, status, is_delete, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      user.username,
      password,
      user.first_name,
      user.last_name,
      user.phone,
      user.email,
      user.gender,
      user.image_url,
      user.status,
      user.is_delete,
    ]
  );
};
