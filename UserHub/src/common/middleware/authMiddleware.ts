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
import { isMainAdminRow, staffKindFromRow } from "../utils/adminIdentity";

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
      exp: number;
      username: string;
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
      authReq.user = { id: Number(decoded.id), is_staff: false };
    }

    // ── Admin / Subadmin session ──────────────────────────────────────────────
    if (adminTokenRow) {
      const adminRow = await findAdminById(Number(decoded.id));
      
      if (!adminRow || adminRow.status !== "active") {
        clearAuthCookie(res);
        clearSessionCookies(res);
        return res.status(401).json({ success: false, message: "Session invalid" });
      }
      const main = isMainAdminRow(adminRow);
      authReq.user = {
        id: Number(decoded.id),
        is_staff: true,
        is_main_admin: main,
        role_id: adminRow.role_id ?? undefined,
        staff_kind: staffKindFromRow(adminRow),
      };
    }

    // ── Sliding session refresh (< 6 hours left) ──────────────────────────────
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = decoded.exp ?? 0;
    const shouldRefresh = expSec > 0 && expSec - nowSec <= 6 * 60 * 60;

    if (shouldRefresh && authReq.user) {
      const payload: Record<string, unknown> = {
        id: authReq.user.id,
        username: decoded.username ?? "",
      };

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

/** User-only guard for routes under `/api/*` (non-staff). */
export const requireUserSession: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (authReq.user.is_staff) {
    return res.status(403).json({ success: false, message: "Forbidden: user session required" });
  }
  return next();
};

/** Staff-only guard for routes under `/api/admin/*` and `/api/subadmin/*`. */
export const requireStaffSession: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (!authReq.user.is_staff) {
    return res.status(403).json({ success: false, message: "Forbidden: staff session required" });
  }
  return next();
};

// export const allowRoles = (...roles: number[]): RequestHandler => {
//   return (req, res, next) => {
//     const authReq = req as AuthRequest;
//     if (!authReq.user || !roles.includes(authReq.user.role)) {
//       return res.status(403).json({ success: false, message: "Forbidden" });
//     }
//     next();
//   };
// };
