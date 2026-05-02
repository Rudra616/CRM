import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { getPermissionByRoleAndModule } from "../permission.service";

export type PermissionAction = "can_view" | "can_add" | "can_edit" | "can_delete";

/**
 * Shared RBAC permission check used by middleware and controllers.
 * Keeps frontend-oriented permission APIs aligned with middleware behavior.
 */
export const hasPermissionForUser = async (
  user: AuthRequest["user"] | undefined,
  moduleName: string,
  action: PermissionAction
): Promise<boolean> => {
  if (!user) return false;
  if (user.is_main_admin) return true;
  if (!user.is_staff || !user.role_id) return false;
  const permission = await getPermissionByRoleAndModule(user.role_id, moduleName);
  return Boolean(permission && permission[action] === 1);
};

/**
 * Permission middleware
 * @param moduleName - module name from DB (e.g. "user", "product")
 * @param action - permission action (can_view, can_add, can_edit, can_delete)
 */
export const checkPermission = (
  moduleName: string,
  action: PermissionAction
): RequestHandler => {
  return async (req, res, next) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.is_main_admin) {
        return next();
      }

      if (!user.is_staff || !user.role_id) {
        return res.status(403).json({ message: "No role assigned" });
      }

      const allowed = await hasPermissionForUser(user, moduleName, action);
      if (!allowed) {
        return res.status(403).json({ message: "No permission setup or denied" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  };
};



/** Skip staff-only handlers so the next `POST /message` route runs (regular ticket owners). */
export const skipUnlessStaff: RequestHandler = (req, res, next) => {
  if ((req as AuthRequest).user?.is_staff) return next();
  next("route");
};