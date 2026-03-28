/**
 * Decode JWT payload only (no signature verification).
 * The real session is the httpOnly cookie; use GET /session for trusted data.
 * This is useful if you ever expose the token to JS (e.g. debugging) or read a non-httpOnly cookie.
 */
export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  jwt: string
): T | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
