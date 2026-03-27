import { Response } from "express";

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie("token", token, cookieOptions);
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });
};

export const clearSessionCookies = (res: Response) => {
  res.clearCookie("sid", { path: "/" });
  res.clearCookie("auth_session", { path: "/" });
};