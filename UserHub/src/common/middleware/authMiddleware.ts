import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { signToken, verifyToken } from "../helpers/common.helper";
import { clearAuthCookie, clearSessionCookies, setAuthCookie } from "../helpers/cookie.helper";
import { findUserToken, findAdminToken, upsertAdminToken, upsertUserToken } from "../../modules/token.service";

export const authenticate: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;
  const token = authReq.cookies.token;
  if (!token) {
    clearAuthCookie(res);
    clearSessionCookies(res);
    return res.status(401).json({ success: false, message: "Token required" });
  }

  try {
    const decoded = verifyToken(token) as { id: number; role: number | string; exp?: number };

    const userTokenRow  = await findUserToken(token);
    const adminTokenRow = await findAdminToken(token);

    if (!userTokenRow && !adminTokenRow) {
      clearAuthCookie(res);
      clearSessionCookies(res);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const role = adminTokenRow ? 1 : userTokenRow.role_id;

    // Sliding session: refresh token+cookie when close to expiry.
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = decoded.exp ?? 0;
    const shouldRefresh = expSec > 0 && expSec - nowSec <= 6 * 60 * 60; // <= 6 hours left

    if (shouldRefresh) {
      const d = decoded as Record<string, unknown>;
      const refreshedToken = signToken({
        id: Number(decoded.id),
        role,
        username: String(d.username ?? adminTokenRow?.username ?? userTokenRow?.username ?? ""),
        firstname: String(d.firstname ?? ""),
        lastname: String(d.lastname ?? ""),
        email: String(d.email ?? ""),
        phone: String(d.phone ?? ""),
        gender: d.gender != null ? String(d.gender) : undefined,
      });
      if (adminTokenRow) {
        await upsertAdminToken(Number(decoded.id), adminTokenRow.username, refreshedToken);
      } else if (userTokenRow) {
        await upsertUserToken(Number(decoded.id), userTokenRow.username, role, refreshedToken);
      }
      setAuthCookie(res, refreshedToken);
    }

    authReq.user = { id: Number(decoded.id), role };
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