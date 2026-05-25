import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserInfo } from './types/common.types';
import { buildSessionEndedLoginUrl } from './utils/authSession';
import { canUseSocket, connectSocket, disconnectSocket, onSocket, SOCKET_EVENTS } from './socket';

export const useSocketSession = (user: UserInfo | null, logout: () => Promise<void>): void => {
  const navigate = useNavigate();
  const userId = user?.id;
  const isStaff = user?.is_staff;
  const isMainAdmin = user?.is_main_admin;

  useEffect(() => {
    if (!canUseSocket(user)) {
      disconnectSocket();
      return;
    }

    connectSocket();

    const offSession = onSocket(SOCKET_EVENTS.SESSION_ENDED, () => {
      void logout().then(() => {
        navigate(buildSessionEndedLoginUrl(window.location.pathname), { replace: true });
      });
    });

    const offUserStatus = onSocket(SOCKET_EVENTS.USER_STATUS, (payload) => {
      const p = payload as { status?: string };
      if (isStaff) return;
      if (p.status !== 'active') {
        void logout().then(() => {
          navigate(buildSessionEndedLoginUrl(window.location.pathname), { replace: true });
        });
      }
    });

    return () => {
      offSession();
      offUserStatus();
    };
  }, [userId, isStaff, isMainAdmin, logout, navigate]);
};
