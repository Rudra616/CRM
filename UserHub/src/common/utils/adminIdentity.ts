import { StaffAuthLevel, type StaffKind } from "../types/role";

/** Single main admin row: match this username (case-insensitive). */
export const MAIN_ADMIN_USERNAME = "admin";

/** True if this row is the built-in super admin (no RBAC role_id required). */
export const isMainAdminRow = (row: { username: string }): boolean =>
  String(row.username).trim().toLowerCase() === MAIN_ADMIN_USERNAME;

/**
 * Subadmin = any admin user that is not the main admin and has a role_id for RBAC.
 */
export const isSubadminRow = (row: {
  username: string;
  role_id?: number | null;
}): boolean =>
  !isMainAdminRow(row) &&
  row.role_id != null &&
  Number(row.role_id) > 0;

export const adminRowToStaffAuthLevel = (row: {
  username: string;
  role_id?: number | null;
}): StaffAuthLevel =>
  isMainAdminRow(row) ? StaffAuthLevel.OWNER : StaffAuthLevel.DELEGATE;

export const staffKindFromRow = (row: {
  username: string;
  role_id?: number | null;
}): StaffKind => (isMainAdminRow(row) ? "main_admin" : "delegated");
