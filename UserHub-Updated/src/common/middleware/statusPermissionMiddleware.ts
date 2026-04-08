import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { Role } from "../types/role";

const ADMIN_ALLOWED = new Set(["active", "pending", "inactive", "delete"]);
const SUBADMIN_ALLOWED = new Set(["inactive"]);

/**
 * Guard for user status updates:
 * - admin: full status control
 * - subadmin: limited status control (inactive only)
 */
export const enforceStatusPermission: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;
  const actorRole = authReq.user?.role;
  const nextStatus = String(req.body?.status || "").toLowerCase();

  if (!nextStatus) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  if (actorRole === Role.ADMIN) {
    if (!ADMIN_ALLOWED.has(nextStatus)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    return next();
  }

  if (actorRole === Role.SUBADMIN) {
    if (!SUBADMIN_ALLOWED.has(nextStatus)) {
      return res.status(403).json({
        success: false,
        message: "Subadmin can only set status to inactive",
      });
    }
    return next();
  }

  return res.status(403).json({ success: false, message: "Forbidden" });
};

