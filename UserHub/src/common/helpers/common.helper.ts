import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

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
  const abs = path.join(__dirname, "../../", relativeUrl);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
};

export const buildImageUrl = (filename: string): string =>
  `/uploads/${filename}`;