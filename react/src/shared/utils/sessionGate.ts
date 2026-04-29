import type { UserInfo } from '../types/common.types';

/** Who is signed in — no legacy string “roles”. */
export type SessionGate = 'owner' | 'delegate' | 'member';

export const sessionGate = (u: UserInfo | null | undefined): SessionGate => {
  if (!u?.is_staff) return 'member';
  if (u.is_main_admin) return 'owner';
  return 'delegate';
};

export const isOwnerSession = (u: UserInfo | null | undefined): boolean =>
  !!u?.is_staff && !!u.is_main_admin;

export const isDelegateStaffSession = (u: UserInfo | null | undefined): boolean =>
  !!u?.is_staff && !u.is_main_admin;

/** Default landing route for this session. */
export const homePathForGate = (gate: SessionGate): string => {
  if (gate === 'owner') return '/admin/dashboard';
  if (gate === 'delegate') return '/subadmin/dashboard';
  return '/user/dashboard';
};
