import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { signToken, verifyToken } from "../helpers/common.helper";
import { clearAuthCookie, clearSessionCookies, setAuthCookie } from "../helpers/cookie.helper";
import {
  findUserToken,
  findAdminToken,
  upsertAdminToken,
  upsertUserToken,
  removeUserToken,
} from "../../modules/token.service";
import { findUserById } from "../../modules/user/user.service";
import { findAdminById } from "../../modules/admin/service/admin.service";
import { Role, AdminRole } from "../types/role";

const adminRoleToNumeric = (role: AdminRole): number =>
  role === "admin" ? Role.ADMIN : Role.SUBADMIN;

export const authenticate: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;
  const token = authReq.cookies.token;

  if (!token) {
    clearAuthCookie(res);
    clearSessionCookies(res);
    return res.status(401).json({ success: false, message: "Token required" });
  }

  try {
    const decoded = verifyToken(token) as {
      id: number;
      role?: number | string;
      exp?: number;
      username?: string;
    };

    const userTokenRow  = await findUserToken(token);
    const adminTokenRow = await findAdminToken(token);

    if (!userTokenRow && !adminTokenRow) {
      clearAuthCookie(res);
      clearSessionCookies(res);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // ── User session (no role concept) ────────────────────────────────────────
    if (userTokenRow) {
      const row = await findUserById(Number(decoded.id));
      if (!row || row.status !== "active") {
        try { await removeUserToken(token); } catch { /* ignore */ }
        clearAuthCookie(res);
        clearSessionCookies(res);
        return res.status(401).json({ success: false, message: "Session invalid" });
      }
      // Plain users do not have admin/subadmin role permissions.
      authReq.user = { id: Number(decoded.id), role: 0 };
    }

    // ── Admin / Subadmin session ──────────────────────────────────────────────
    if (adminTokenRow) {
      const adminRow = await findAdminById(Number(decoded.id));
      if (!adminRow || adminRow.status !== "active") {
        clearAuthCookie(res);
        clearSessionCookies(res);
        return res.status(401).json({ success: false, message: "Session invalid" });
      }
      const numericRole = adminRoleToNumeric(adminRow.role);
      authReq.user = { id: Number(decoded.id), role: numericRole, adminRole: adminRow.role };
    }

    // ── Sliding session refresh (< 6 hours left) ──────────────────────────────
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = decoded.exp ?? 0;
    const shouldRefresh = expSec > 0 && expSec - nowSec <= 6 * 60 * 60;

    if (shouldRefresh && authReq.user) {
      // Users: no role in JWT. Admins/subadmins: include numeric role.
      const payload: Record<string, unknown> = {
        id: authReq.user.id,
        username: decoded.username ?? "",
      };
      if (adminTokenRow) payload.role = authReq.user.role;

      const refreshedToken = signToken(payload);
      if (adminTokenRow) {
        await upsertAdminToken(authReq.user.id, adminTokenRow.username, refreshedToken);
      } else if (userTokenRow) {
        await upsertUserToken(authReq.user.id, userTokenRow.username, refreshedToken);
      }
      setAuthCookie(res, refreshedToken);
    }

    next();
  } catch {
    clearAuthCookie(res);
    clearSessionCookies(res);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const allowRoles = (...roles: number[]): RequestHandler => {
  return (req, res, next) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
};
