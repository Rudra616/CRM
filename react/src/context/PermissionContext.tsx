// src/context/PermissionContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getMyPermissionsApi,
  type PermissionEntry,
  type PermissionMap,
} from '../modules/admin/api/admin.api';
import { useAuth } from './AuthContext';

const DEFAULT_PERM: PermissionEntry = {
  can_view: false,
  can_add: false,
  can_edit: false,
  can_delete: false,
};

type PermissionContextType = {
  getModulePerm: (moduleName: string) => PermissionEntry;
  /** Full bypass (main administrator). */
  isOwnerBypass: boolean;
  permLoading: boolean;
};

const PermissionContext = createContext<PermissionContextType>({
  getModulePerm: () => DEFAULT_PERM,
  isOwnerBypass: false,
  permLoading: true,
});

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isOwnerBypass, setIsOwnerBypass] = useState(false);
  const [permLoading, setPermLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_staff) {
      setIsOwnerBypass(false);
      setPermissions({});
      setPermLoading(false);
      return;
    }

    if (user.is_main_admin) {
      setIsOwnerBypass(true);
      setPermissions({});
      setPermLoading(false);
      return;
    }

    setPermLoading(true);
    getMyPermissionsApi()
      .then((res) => {
        setIsOwnerBypass(res.data?.isAdmin ?? false);
        setPermissions(res.data?.permissions ?? {});
      })
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [user?.id, user?.is_staff, user?.is_main_admin, user?.role_id]);

  const getModulePerm = (moduleName: string): PermissionEntry => {
    if (isOwnerBypass) {
      return { can_view: true, can_add: true, can_edit: true, can_delete: true };
    }
    const wanted = moduleName.toLowerCase().trim();
    const matchedKey = Object.keys(permissions).find((k) => k.toLowerCase().trim() === wanted);
    return matchedKey ? permissions[matchedKey] : DEFAULT_PERM;
  };

  return (
    <PermissionContext.Provider value={{ getModulePerm, isOwnerBypass, permLoading }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);
