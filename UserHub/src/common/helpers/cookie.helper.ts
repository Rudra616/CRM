import { Response } from "express";

/**
 * Cookie configuration used for authentication cookies
 * Controls security scope and expiry to the cookie
 */
const cookieOptions = {
  httpOnly: true, // Br
  secure: false, // Cookie works on HTTP
  sameSite: "lax" as const,  //Prevents CSRF attacks.
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

/**
 * set authentication cookies (login action)
 * 
 * @param res - Express response object used to set cookies
 * @param token - JWT or authentication token to store in cookie
 */
export const setAuthCookie = (res: Response, token: string) => {
  res.cookie("token", token, cookieOptions);
};

/**
 * Clears the authentication cookie (logout action)
 * 
 * @param res  Express response object used to clear cookies
 */
export const clearAuthCookie = (res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });
};

/**
 * clear session related cookies used for authentication/session tracking
 * 
 * @param res - Express respose object used to clear cookies
 */
export const clearSessionCookies = (res: Response) => {
  res.clearCookie("sid", { path: "/" });
  res.clearCookie("auth_session", { path: "/" });
};