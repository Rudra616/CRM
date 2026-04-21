// src/context/PermissionContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyPermissionsApi, type PermissionEntry, type PermissionMap } from '../modules/admin/api/admin.api';
import { useAuth } from './AuthContext';

const DEFAULT_PERM: PermissionEntry = {
  can_view: false, can_add: false, can_edit: false, can_delete: false,
};

type PermissionContextType = {
  getModulePerm: (moduleName: string) => PermissionEntry;
  getRoutePerm: (routePath: string) => PermissionEntry;
  isAdmin: boolean;
  permLoading: boolean;
};

const PermissionContext = createContext<PermissionContextType>({
  getModulePerm: () => DEFAULT_PERM,
  getRoutePerm: () => DEFAULT_PERM,
  isAdmin: false,
  permLoading: true,
});

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isAdmin, setIsAdmin]         = useState(false);
  const [permLoading, setPermLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
      setIsAdmin(false);
      setPermissions({});
      setPermLoading(false);
      return;
    }

    if (user.role === 'admin') {
      // Admin has full access; no permissions API call needed.
      setIsAdmin(true);
      setPermissions({});
      setPermLoading(false);
      return;
    }

    setPermLoading(true);
    getMyPermissionsApi()
      .then((res) => {
        setIsAdmin(res.data?.isAdmin ?? false);
        setPermissions(res.data?.permissions ?? {});
      })
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [user?.id, user?.role]); // re-fetch when user or role changes

  const getModulePerm = (moduleName: string): PermissionEntry => {
    if (isAdmin) {
      // Admin bypasses everything
      return { can_view: true, can_add: true, can_edit: true, can_delete: true };
    }
    return permissions[moduleName] ?? DEFAULT_PERM;
  };

  const normalize = (value: string): string => value.toLowerCase().replace(/[_\s-]/g, '');
  const singular = (value: string): string => {
    if (value.endsWith('ies') && value.length > 3) return `${value.slice(0, -3)}y`;
    if (value.endsWith('s') && value.length > 1) return value.slice(0, -1);
    return value;
  };

  const resolveKeyFromRoute = (routePath: string): string | null => {
    const keys = Object.keys(permissions);
    if (!keys.length) return null;

    const routeParts = routePath
      .split('/')
      .map((part) => normalize(part.trim()))
      .filter(Boolean)
      .filter((part) => !['admin', 'subadmin', 'rbac'].includes(part));

    const candidates = routeParts.flatMap((part) => {
      const base = singular(part);
      return [part, base];
    });

    for (const candidate of candidates) {
      const exact = keys.find((key) => normalize(key) === candidate);
      if (exact) return exact;
    }

    for (const candidate of candidates) {
      const byContains = keys.find((key) => normalize(key).includes(candidate));
      if (byContains) return byContains;
    }

    return null;
  };

  const getRoutePerm = (routePath: string): PermissionEntry => {
    if (isAdmin) {
      return { can_view: true, can_add: true, can_edit: true, can_delete: true };
    }

    const key = resolveKeyFromRoute(routePath);
    if (key) return permissions[key] ?? DEFAULT_PERM;

    return DEFAULT_PERM;
  };

  return (
    <PermissionContext.Provider value={{ getModulePerm, getRoutePerm, isAdmin, permLoading }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);