

const STORAGE_KEYS_TO_CLEAR = ['user', 'token', 'refreshToken'] as const;

export const PUBLIC_AUTH_PATHS = [
  '/login',
  '/admin',
  '/admin/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return (PUBLIC_AUTH_PATHS as readonly string[]).includes(pathname);
}

/** Clear any legacy client copies of auth (cookies are httpOnly; server clears those on 401). */
export function clearClientAuthStorage(): void {
  for (const key of STORAGE_KEYS_TO_CLEAR) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage disabled */
    }
  }
}

/**
 * Admin-area routes (after /admin/) should return to admin sign-in; everyone else to /login.
 */
export function getLoginRedirectUrl(pathname: string): string {
  if (pathname.startsWith('/admin/')) {
    return '/admin/login';
  }
  return '/login';
}

/** Full URL for hard navigation after unauthorized access (shows a neutral message on login). */
export function buildSessionEndedLoginUrl(pathname: string): string {
  const target = getLoginRedirectUrl(pathname);
  const sep = target.includes('?') ? '&' : '?';
  return `${target}${sep}reason=session`;
}
