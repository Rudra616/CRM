import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { roleIdToRole } from '../shared/utils/roleUtils';
import type { UserInfo } from '../shared/types/common.types';
import { logoutAdminApi, logoutApi } from '../modules/auth/api/auth.api';
import { apiRequest } from '../shared/api/apiWrapper';

interface AuthContextType {
  user: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_USER_KEY = 'user';

const normalizeUser = (userData: UserInfo): UserInfo => {
  const role = (userData as any).role_id ?? userData.role;
  return {
    ...userData,
    role: roleIdToRole(role),
  };
};
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isForceLogoutRunning = useRef(false);

  const clearStoredUser = () => {
    localStorage.removeItem(STORAGE_USER_KEY);
  };

  const storeUser = (userData: UserInfo) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
  };

  const forceLogoutBecauseTampered = useCallback(async () => {
    if (isForceLogoutRunning.current) return;
    isForceLogoutRunning.current = true;
    try {
      // Call both logout endpoints so backend can clear whichever token table/cookies apply.
      await Promise.allSettled([logoutApi(), logoutAdminApi()]);
    } finally {
      clearStoredUser();
      setUser(null);
      const isAdminPath = window.location.pathname.startsWith('/admin');
      window.location.href = isAdminPath ? '/admin/login' : '/login';
      isForceLogoutRunning.current = false;
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const path = window.location.pathname;
      const isPublicAuthPage =
        path === '/login' ||
        path === '/admin' ||
        path === '/admin/login' ||
        path === '/register' ||
        path === '/forgot-password' ||
        path === '/reset-password';

      // If we're on a public auth page, don't call profile endpoints (avoids noisy 401s).
      if (isPublicAuthPage) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const isAdminArea =
        path === '/admin' ||
        path === '/admin/login' ||
        path.startsWith('/admin/');
      const endpoint = isAdminArea ? '/admin/profile' : '/profile';

      try {
        // Probe only one profile endpoint based on current route
        const res = await apiRequest<UserInfo>('GET', endpoint);
        if (res.data) {
          const normalized = normalizeUser(res.data);
          setUser(normalized);
          storeUser(normalized);
          return;
        }
        clearStoredUser();
        setUser(null);
      } catch {
        clearStoredUser();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = (userData: UserInfo) => {
    const normalized = normalizeUser(userData);
    storeUser(normalized);
    setUser(normalized);
  };

  const logout = async (): Promise<void> => {
    try {
      await Promise.allSettled([logoutApi(), logoutAdminApi()]);
    } catch {
      // clear state even if API call fails
    } finally {
      clearStoredUser();
      setUser(null);
    }
  };

  useEffect(() => {
    const validateStorage = () => {
      if (!user) return;
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (!raw) {
        void forceLogoutBecauseTampered();
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Partial<UserInfo>;
        const changed =
          String(parsed.id ?? '') !== String(user.id) ||
          String(parsed.role ?? '') !== String(user.role);
        if (changed) {
          void forceLogoutBecauseTampered();
        }
      } catch {
        void forceLogoutBecauseTampered();
      }
    };

    // Same-tab checks
    const onFocus = () => validateStorage();
    const onClick = () => validateStorage();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') validateStorage();
    };
    // Other-tab checks
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_USER_KEY) validateStorage();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [user, forceLogoutBecauseTampered]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};