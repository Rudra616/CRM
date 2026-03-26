import { RequestHandler } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { verifyToken } from "../helpers/common.helper";
import { findUserToken, findAdminToken } from "../services/token.service";

export const authenticate: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;
  const token = authReq.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token required" });
  }

  try {
    const decoded = verifyToken(token) as { id: number; role: number | string };

    const userTokenRow  = await findUserToken(token);
    const adminTokenRow = await findAdminToken(token);

    if (!userTokenRow && !adminTokenRow) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const role = adminTokenRow ? 1 : userTokenRow.role_id;

    authReq.user = { id: Number(decoded.id), role };
    next();
  } catch {
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