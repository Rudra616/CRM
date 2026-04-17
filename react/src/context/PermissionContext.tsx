// src/context/PermissionContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyPermissionsApi, type PermissionEntry, type PermissionMap } from '../modules/admin/api/admin.api';
import { useAuth } from './AuthContext';

const DEFAULT_PERM: PermissionEntry = {
  can_view: false, can_add: false, can_edit: false, can_delete: false,
};

type PermissionContextType = {
  getModulePerm: (moduleName: string) => PermissionEntry;
  isAdmin: boolean;
  permLoading: boolean;
};

const PermissionContext = createContext<PermissionContextType>({
  getModulePerm: () => DEFAULT_PERM,
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
        setIsAdmin(res.data.isAdmin);
        setPermissions(res.data.permissions);
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

  return (
    <PermissionContext.Provider value={{ getModulePerm, isAdmin, permLoading }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);