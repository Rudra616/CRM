import { RequestHandler } from "express";
import Jwt from "jsonwebtoken";
import { AuthRequest } from "../types/AuthRequest";
import db from "../config/db";

// Verify token middleware
export const verifyToken: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthRequest;
  const token = authReq.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token required" });
  }

  try {

    const decoded = Jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: number; role: number | string };

    const [userRows]: any = await db.query(
      "SELECT * FROM user_tokens WHERE token = ?",
      [token]
    );

    const [adminRows]: any = await db.query(
      "SELECT * FROM admin_tokens WHERE token = ?",
      [token]
    );

    if (userRows.length === 0 && adminRows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    let role;

    if (userRows.length > 0) {
      role = userRows[0].role_id;
    }

    if (adminRows.length > 0) {
      role = 1;
    }

    authReq.user = {
      id: Number(decoded.id),
      role: role
    };

    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
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



