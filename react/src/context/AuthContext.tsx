import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { roleIdToRole } from '../shared/utils/roleUtils';
import type { UserInfo } from '../shared/types/common.types';
import { logoutAdminApi, logoutApi } from '../modules/auth/api/auth.api';
import { getAdminProfileApi } from '../modules/admin/api/admin.api';
import { getProfileApi } from '../modules/user/api/user.api';
import { clearClientAuthStorage, isPublicAuthPath } from '../shared/utils/authSession';
import { saveUserToStorage,clearUserStorage,loadUserFromStorage } from '../shared/authSession';
interface AuthContextType {
  user: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (userData: UserInfo): UserInfo => {
  const role = (userData as unknown as { role_id?: number }).role_id ?? userData.role;
  return {
    ...userData,
    role: roleIdToRole(role),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<UserInfo | null>(null);

const login = (userData: UserInfo) => {
  const normalized = normalizeUser(userData);
  saveUserToStorage(normalized);   // ← add this
  userRef.current = normalized;
  setUser(normalized);
};

const logout = async (): Promise<void> => {
  const currentRole = userRef.current?.role;
  try {
    if (currentRole === 'admin') {
      await logoutAdminApi();
    } else {
      await logoutApi();
    }
  } catch {}
  finally {
    clearClientAuthStorage();
    clearUserStorage();          // ← add this
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

  const stored = loadUserFromStorage();   // ← try localStorage first
  if (stored) {
    login(stored);
    setIsLoading(false);
    return;                               // ← skip ALL profile API calls
  }

  // No stored user — fall through to API calls as fallback
  // (handles first load after hard logout or cleared storage)
  const isAdminApp = path.startsWith('/admin/') && !path.startsWith('/admin/login');

  if (isAdminApp) {
    setIsLoading(true);
    void (async () => {
      try {
        const res = await getAdminProfileApi();
        if (res.data) {
          login({ ...res.data, role: 'admin', firstname: '', lastname: '', phone: '' });
        }
      } catch {
        clearClientAuthStorage();
      } finally {
        setIsLoading(false);
      }
    })();
    return;
  }
    const needsUserBootstrap =
      path.startsWith('/user/') ||
      path.startsWith('/subadmin/') ||
      path === '/profile' ||
      path === '/change-password' ||
      path === '/users';

    if (needsUserBootstrap) {
      setIsLoading(true);
      void (async () => {
        try {
          const res = await getProfileApi();
          const p = res.data;
          if (p) {
            const row = p as typeof p & { role_id?: number };
            login(
              normalizeUser({
                id: Number(row.id),
                username: row.username,
                email: row.email,
                role_id: row.role_id,
                role: row.role,
                firstname: row.firstname ?? '',
                lastname: row.lastname ?? '',
                phone: row.phone ?? '',
              } as UserInfo & { role_id?: number })
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

    setIsLoading(false);
  }, []);

  // Session validity is checked on each real API call (auth middleware + axios 401), not a background ping.

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
