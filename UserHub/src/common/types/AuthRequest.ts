import { Request } from "express";
import { AdminRole } from "./role";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    /**
     * Internal numeric role used by allowRoles() middleware.
     * Admin = 1, Subadmin = 2, user sessions = 0 (no privileged role).
     */
    role: number;
    /** Only populated for admin/subadmin sessions. Never set for plain users. */
    adminRole?: AdminRole;
  };
}
