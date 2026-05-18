import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { UserInfo } from '../shared/types/common.types';
import { MAIN_ADMIN_USERNAME } from '../shared/constants/adminAuth';
import { logoutAdminApi, logoutApi } from '../modules/auth/api/auth.api';
import { getAdminProfileApi } from '../modules/admin/api/admin.api';
import { getProfileApi } from '../modules/user/api/user.api';
import {
  clearClientAuthStorage,
  isPublicAuthPath,
} from '../shared/utils/authSession';
import {
  saveUserToStorage,
  clearUserStorage,
  loadUserFromStorage,
} from '../shared/authSession';

interface AuthContextType {
  user: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Admin-table profile row shape (backend may send snake_case names). */
type AdminProfileRow = {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role_id?: number | null;
  first_name?: string;
  last_name?: string;
};

const authFromAdminRow = (
  row: AdminProfileRow,
  is_main_admin: boolean,
  defaults: Partial<UserInfo>
): UserInfo => ({
  id: Number(row.id),
  username: row.username,
  email: row.email ?? '',
  firstname: defaults.firstname ?? row.first_name ?? '',
  lastname: defaults.lastname ?? row.last_name ?? '',
  phone: defaults.phone ?? row.phone ?? '',
  is_staff: true,
  is_main_admin,
  role_id: row.role_id ?? null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<UserInfo | null>(null);

  const login = (userData: UserInfo) => {
    saveUserToStorage(userData);
    userRef.current = userData;
    setUser(userData);
  };

  const logout = async (): Promise<void> => {
    const current = userRef.current;
    try {
      if (current?.is_staff) await logoutAdminApi();
      else await logoutApi();
    } catch {}
    finally {
      clearClientAuthStorage();
      clearUserStorage();
      userRef.current = null;
      setUser(null);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;

    if (isPublicAuthPath(path)) {
      setIsLoading(false);
      return;
    }

    const stored = loadUserFromStorage();
    if (stored) {
      login(stored);
      setIsLoading(false);
      return;
    }

    const isAdminArea =
      path.startsWith('/admin/') && !path.startsWith('/admin/login');

    if (isAdminArea) {
      setIsLoading(true);
      void (async () => {
        try {
          const res = await getAdminProfileApi();
          if (res.data) {
            const row = res.data as AdminProfileRow;
            const uname = String(row.username ?? '').trim().toLowerCase();
            login(
              authFromAdminRow(row, uname === MAIN_ADMIN_USERNAME.toLowerCase(), {})
            );
          }
        } catch {
          clearClientAuthStorage();
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }

    const needsMemberOrSharedBootstrap =
      path.startsWith('/user/') ||
      path.startsWith('/tickets/') ||
      path === '/profile' ||
      path === '/change-password' ||
      path === '/users';

    if (needsMemberOrSharedBootstrap) {
      setIsLoading(true);
      void (async () => {
        try {
          if (path === '/profile' || path === '/change-password') {
            try {
              const s = await getAdminProfileApi();
              if (s.data) {
                const row = s.data as AdminProfileRow;
                const uname = String(row.username ?? '').trim().toLowerCase();
                login(
                  authFromAdminRow(row, uname === MAIN_ADMIN_USERNAME.toLowerCase(), {})
                );
                return;
              }
            } catch {
              /* not a staff cookie — fall through to member profile */
            }
          }

          const res = await getProfileApi();
          const p = res.data;
          if (p) {
            const row = p as typeof p & {
              role_id?: number | null;
              first_name?: string;
              last_name?: string;
            };
            login({
              id: Number(row.id),
              username: row.username,
              email: row.email,
              firstname:
                (row as unknown as { firstname?: string }).firstname ??
                row.first_name ??
                '',
              lastname:
                (row as unknown as { lastname?: string }).lastname ??
                row.last_name ??
                '',
              phone: row.phone ?? '',
              is_staff: false,
              is_main_admin: false,
              role_id: row.role_id ?? undefined,
            });
          }
        } catch {
          clearClientAuthStorage();
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }

    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshSession: async () => {},
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
