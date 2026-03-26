import nodemailer from "nodemailer";
import { signToken } from "./common.helper";

// ─── Email ────────────────────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (
  userId: number,
  toEmail: string
): Promise<string> => {
  const { JWT_SECRET, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, FRONTEND_URL } =
    process.env;

  if (!JWT_SECRET || !SMTP_USER || !SMTP_PASS || !SMTP_HOST || !SMTP_PORT || !FRONTEND_URL)
    throw new Error("Email server or JWT configuration is missing in environment variables");

  const token = signToken({ id: userId }, "15m");
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"My App" <${SMTP_USER}>`,
    to: toEmail,
    subject: "Reset Password",
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 15 minutes.</p>`,
  });

  return token;
};

// ─── Role ─────────────────────────────────────────────────────────────────────

export const roleLabel = (roleId: number): string => {
  const map: Record<number, string> = { 1: "admin", 2: "subadmin", 3: "user" };
  return map[roleId] ?? "user";
};