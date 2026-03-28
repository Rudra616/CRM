import nodemailer from "nodemailer";
import { signToken } from "./common.helper";

// ─── Email ────────────────────────────────────────────────────────────────────
const buildResetEmail = (toEmail: string, resetUrl: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #111;">Reset Your Password</h2>
    <p style="color: #555;">We received a request to reset the password for your account (<strong>${toEmail}</strong>).</p>
    <p style="color: #555;">Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}"
      style="display:inline-block; margin: 20px 0; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Reset Password
    </a>
    <p style="color: #888; font-size: 13px;">Or copy this link into your browser:<br/>
      <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #aaa; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
  </div>
`;
export const sendPasswordResetEmail = async (
  userId: number,
  toEmail: string
): Promise<void> => {                          // ← void, not Promise<string>
  const { JWT_SECRET, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, FRONTEND_URL } =
    process.env;

  if (!JWT_SECRET || !SMTP_USER || !SMTP_PASS || !SMTP_HOST || !SMTP_PORT || !FRONTEND_URL)
    throw new Error('Email server or JWT configuration is missing');

  const token    = signToken({ id: userId }, '1h');
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"MyApp" <${SMTP_USER}>`,
    to: toEmail,
    subject: 'Reset Your Password — MyApp',
    html: buildResetEmail(toEmail, resetUrl),   // your existing email template
  });
};
// ─── Role ─────────────────────────────────────────────────────────────────────

export const roleLabel = (roleId: number): string => {
  const map: Record<number, string> = { 1: "admin", 2: "subadmin", 3: "user" };
  return map[roleId] ?? "user";
};