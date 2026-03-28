import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { roleIdToRole } from '../shared/utils/roleUtils';
import type { UserInfo } from '../shared/types/common.types';
import { logoutAdminApi, logoutApi, getSessionApi } from '../modules/auth/api/auth.api';
import {
  buildSessionEndedLoginUrl,
  clearClientAuthStorage,
  isPublicAuthPath,
} from '../shared/utils/authSession';

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
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshSession = useCallback(async () => {
    try {
      const res = await getSessionApi();
      if (res.data) {
        setUser(normalizeUser(res.data as UserInfo));
      } else {
        setUser(null);
        clearClientAuthStorage();
        const path = window.location.pathname;
        if (!isPublicAuthPath(path)) {
          window.location.replace(buildSessionEndedLoginUrl(path));
        }
      }
    } catch {
      setUser(null);
      clearClientAuthStorage();
      const path = window.location.pathname;
      if (!isPublicAuthPath(path)) {
        window.location.replace(buildSessionEndedLoginUrl(path));
      }
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const path = window.location.pathname;

      if (isPublicAuthPath(path)) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await getSessionApi();
        if (res.data) {
          setUser(normalizeUser(res.data as UserInfo));
        } else {
          setUser(null);
          clearClientAuthStorage();
          window.location.replace(buildSessionEndedLoginUrl(path));
          return;
        }
      } catch {
        setUser(null);
        clearClientAuthStorage();
        window.location.replace(buildSessionEndedLoginUrl(path));
        return;
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = (userData: UserInfo) => {
    setUser(normalizeUser(userData));
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
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshSession,
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
