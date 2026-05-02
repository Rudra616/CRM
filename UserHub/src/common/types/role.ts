/**
 * Optional hint on `req.user` for staff sessions (not stored as a numeric "role" in JWT).
 */
export type StaffKind = "main_admin" | "delegated";
