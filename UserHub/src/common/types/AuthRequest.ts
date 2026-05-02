import type { Request } from "express";
import type { StaffKind } from "./role";

export interface AuthRequest extends Request {
  user?: {
    id: number;

    /** `true` when session is an `admin` table row; `false` when `user` table. */
    is_staff: boolean;

    /**
     * `true` only for the reserved main admin row (`username` `admin`, case-insensitive).
     * Full permission bypass — not derived from a DB `role` column.
     */
    is_main_admin?: boolean;

    /** RBAC id from `admin.role_id` — permissions via `role_permission`. */
    role_id?: number;

    staff_kind?: StaffKind;
  };
}
