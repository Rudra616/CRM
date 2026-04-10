// AdminRole: used for admin table's `role` column.
export type AdminRole = "admin" | "subadmin";

// AuthRole: numeric identifiers used in JWT + middleware for access control.
export enum Role {
  ADMIN    = 1,
  SUBADMIN = 2,
}
