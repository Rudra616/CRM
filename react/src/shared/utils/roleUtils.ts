export type RoleString = 'admin' | 'subadmin' | 'user';

const roleMap: Record<number, RoleString> = {
  1: 'admin',
  2: 'subadmin',
  3: 'user',
};

export const roleIdToRole = (role: number | string | undefined): RoleString => {
  if (typeof role === 'string' && ['admin', 'subadmin', 'user'].includes(role)) {
    return role as RoleString;
  }
  if (typeof role === 'number') {
    return roleMap[role] ?? 'user';
  }
  return 'user'; // safe fallback instead of undefined
};