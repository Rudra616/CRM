import type { UserInfo } from '../types/common.types';

/** Who is signed in: staff rows use RBAC; members are normal users. */
export type SessionGate = 'staff' | 'member';

export const sessionGate = (u: UserInfo | null | undefined): SessionGate => {
  if (!u?.is_staff) return 'member';
  return 'staff';
};

/** Default landing route for this session. */
export const homePathForGate = (gate: SessionGate): string => {
  if (gate === 'staff') return '/admin/dashboard';
  return '/user/dashboard';
};
