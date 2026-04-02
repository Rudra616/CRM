import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { roleIdToRole } from '../shared/utils/roleUtils';
import type { UserInfo } from '../shared/types/common.types';
import { logoutAdminApi, logoutApi } from '../modules/auth/api/auth.api';
import { getAdminProfileApi } from '../modules/admin/api/admin.api';
import { clearClientAuthStorage } from '../shared/utils/authSession';

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
    } catch {
      // clear state even if API call fails
    } finally {
      clearClientAuthStorage();
      userRef.current = null;
      setUser(null);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    const isAdminRoute =
      path === '/admin' ||
      path === '/admin/login' ||
      path.startsWith('/admin/');

    if (!isAdminRoute) {
      setIsLoading(false);
      return;
    }

    const loadAdmin = async () => {
      try {
        const res = await getAdminProfileApi();
        if (res.data) {
          login({
            id: Number(res.data.id),
            username: res.data.username,
            email: res.data.email,
            role: 'admin',
            firstname: '',
            lastname: '',
            phone: '',
          });
        }
      } catch {
        clearClientAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    loadAdmin();
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
