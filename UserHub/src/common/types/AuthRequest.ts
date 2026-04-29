import type { Request } from "express";
import type { StaffKind } from "./role";

export interface AuthRequest extends Request {
  user?: {
    id: number;

    /**
     * Session level from JWT (`StaffAuthLevel` values for staff; `0` for member users).
     * Not the RBAC database `role_id`.
     */
    role: number;

    /** RBAC id from `admin.role_id` — permissions via role_permission */
    role_id?: number;

    /** Computed hint — not stored in DB */
    staff_kind?: StaffKind;
  };
}
