import { Request } from "express";
import { AdminRole } from "./role";

export interface AuthRequest extends Request {
  user?: {
    id: number;

    /**
     * Internal numeric role used by allowRoles() middleware.
     * Admin = 1, Subadmin = 2, user sessions = 0
     */
    role: number;

    /**
     * DB role_id (used for role_permission table)
     * Only for admin/subadmin
     */
    role_id?: number;

    /** Only populated for admin/subadmin sessions */
    adminRole?: AdminRole;
  };
}