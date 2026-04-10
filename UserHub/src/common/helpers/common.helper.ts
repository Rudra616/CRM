import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import { Request } from "express";
import { absoluteUploadFilePath } from "../../config/uploads";

// ─── Password ─────────────────────────────────────────────────────────────────

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, 10);

export const comparePassword = (plain: string, hashed: string): Promise<boolean> =>
  bcrypt.compare(plain, hashed);

// ─── JWT ──────────────────────────────────────────────────────────────────────

export const signToken = (
  payload: object,
  expiresIn: string = "1d"
): string => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn } as any);
};

export const verifyToken = (token: string): any => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.verify(token, process.env.JWT_SECRET as string);
};

// ─── File ─────────────────────────────────────────────────────────────────────

export const deleteFileIfExists = (relativeUrl: string): void => {
  const abs = absoluteUploadFilePath(relativeUrl);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
};

export const buildImageUrl = (req: Request, filePath: string): string => {
  const host = req.headers.host;
  return `${req.protocol}://${host}/${filePath}`;
};
