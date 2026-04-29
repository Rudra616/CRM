/**
 * Staff session level in JWT (`payload.role`) and `req.user.role`.
 *
 * This is NOT:
 * - the removed `admin.role` DB column
 * - the RBAC `role_id` / `role` table — use `req.user.role_id` for permissions
 *
 * Values are fixed for existing tokens: 1 = main administrator, 2 = delegated staff.
 */
export enum StaffAuthLevel {
  /** Reserved main admin row — full bypass in permission middleware */
  OWNER = 1,
  /** Other `admin` table rows — permissions from `role_id` → role_permission */
  DELEGATE = 2,
}

/**
 * Optional string mirror of {@link StaffAuthLevel} on `req.user` (debug / logging).
 * Not stored in the database.
 */
export type StaffKind = "main_admin" | "delegated";
