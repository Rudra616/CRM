import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { Role } from "../types/role";
import { getPermissionByRoleAndModule } from "../permission.service";

/**
 * Permission middleware
 * @param moduleName - module name from DB (e.g. "user", "product")
 * @param action - permission action (can_view, can_add, can_edit, can_delete)
 */
export const checkPermission = (
  moduleName: string,
  action: "can_view" | "can_add" | "can_edit" | "can_delete"
): RequestHandler => {
  return async (req, res, next) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      console.log("🔐 USER:", user);
      console.log("📦 MODULE:", moduleName);
      console.log("⚙️ ACTION:", action);

      if (!user) {
        console.log("❌ No user");
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ✅ Admin bypass
      if (user.role === Role.ADMIN) {
        console.log("✅ Admin bypass");
        return next();
      }

      if (!user.role_id) {
        console.log("❌ No role_id");
        return res.status(403).json({ message: "No role assigned" });
      }

      const permission = await getPermissionByRoleAndModule(
        user.role_id,
        moduleName
      );

      console.log("📊 DB Permission:", permission);

      if (!permission) {
        console.log("❌ No permission found");
        return res.status(403).json({ message: "No permission setup" });
      }

      if (permission[action] !== 1) {
        console.log("❌ Permission denied");
        return res.status(403).json({ message: "Permission denied" });
      }

      console.log("✅ Permission granted");
      next();
    } catch (err) {
      console.log("🔥 ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/** Pass if ANY of the alternatives grants the action (subadmin); admin always passes. */
export const checkPermissionAny = (
  alternatives: Array<
    [string, "can_view" | "can_add" | "can_edit" | "can_delete"]
  >
): RequestHandler => {
  return async (req, res, next) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.role === Role.ADMIN) {
        return next();
      }

      if (!user.role_id) {
        return res.status(403).json({ message: "No role assigned" });
      }

      for (const [moduleName, action] of alternatives) {
        const permission = await getPermissionByRoleAndModule(user.role_id, moduleName);
        if (permission && permission[action] === 1) {
          return next();
        }
      }

      return res.status(403).json({ message: "Permission denied" });
    } catch (err) {
      console.log("🔥 ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};