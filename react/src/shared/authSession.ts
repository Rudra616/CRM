import type { UserInfo } from './types/common.types';

const USER_KEY = 'user_info';

export const saveUserToStorage = (user: UserInfo) => {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      is_staff: user.is_staff,
      is_main_admin: user.is_main_admin,
      role_id: user.role_id,
    })
  );
};

/** Migrate old storage that used `role: 'admin'|'subadmin'|'user'`. */
function migrateLegacyStored(raw: Record<string, unknown>): UserInfo | null {
  if (raw && typeof raw === 'object' && 'is_staff' in raw) {
    return raw as unknown as UserInfo;
  }
  const role = raw?.role as string | undefined;
  const id = Number(raw?.id);
  if (!Number.isFinite(id) || !raw?.username) return null;
  const base = {
    id,
    username: String(raw.username),
    email: String(raw.email ?? ''),
    firstname: (raw.firstname as string) ?? '',
    lastname: (raw.lastname as string) ?? '',
    phone: (raw.phone as string) ?? '',
  };
  if (role === 'admin') {
    return { ...base, is_staff: true, is_main_admin: true, role_id: (raw.role_id as number) ?? null };
  }
  if (role === 'subadmin') {
    return {
      ...base,
      is_staff: true,
      is_main_admin: false,
      role_id: (raw.role_id as number) ?? null,
    };
  }
  return { ...base, is_staff: false, is_main_admin: false };
}

export const loadUserFromStorage = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrateLegacyStored(parsed);
    if (!migrated) return null;
    if (!('is_staff' in parsed)) {
      saveUserToStorage(migrated);
    }
    return migrated;
  } catch {
    return null;
  }
};

export const clearUserStorage = () => {
  localStorage.removeItem(USER_KEY);
};
