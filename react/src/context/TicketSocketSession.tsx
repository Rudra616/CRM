import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  disconnectTicketSocket,
  getTicketSocket,
  type NewMessageSocketEvent,
  type StatusUpdatedSocketEvent,
  type TicketUpdatedSocketEvent,
} from '../shared/socket/ticketSocket';
import {
  buildSessionEndedLoginUrl,
  isPublicAuthPath,
} from '../shared/utils/authSession';
import { showSuccess, showSuccessClickable } from '../shared/utils/toast';
import { useAuth } from './AuthContext';

/**
 * Subscribes to the shared socket only when logged-in and not on login/register pages.
 * Staff RBAC is enforced on the server (`io.use` in UserHub).
 * Socket.IO uses `VITE_BACKEND_URL` / `VITE_SOCKET_URL`, not the Vite dev port.
 */
export const TicketSocketSession = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isLoading || !user || isPublicAuthPath(pathname)) {
      disconnectTicketSocket();
      return;
    }

    const socket = getTicketSocket();

    const endSession = () => {
      void logout().finally(() => {
        window.location.replace(buildSessionEndedLoginUrl(window.location.pathname));
      });
    };

    const onStatusUpdated = (payload: StatusUpdatedSocketEvent) => {
      if (payload.type !== 'user_status') return;
      if (payload.userId !== user.id) return;
      if (payload.status === 'active') return;
      endSession();
    };

    const onForceLogout = (payload?: { userId?: number }) => {
      if (payload?.userId && payload.userId !== user.id) return;
      endSession();
    };

    let onNewTicketToast: ((p: TicketUpdatedSocketEvent) => void) | undefined;
    if (user.is_staff) {
      onNewTicketToast = (payload: TicketUpdatedSocketEvent) => {
        if (payload.kind !== 'created') return;
        if (!payload.ownerUsername) return;
        const sub = payload.subject;
        const preview = sub && sub.length > 72 ? `${sub.slice(0, 72)}…` : sub;
        const extra = preview ? ` — "${preview}"` : '';
        showSuccess(`@${payload.ownerUsername} created ticket #${payload.ticketId}${extra}`);
      };
      socket.on('ticket_updated', onNewTicketToast);
    }

    const onNewMessageToast = (p: NewMessageSocketEvent) => {
      if (p.senderId === user.id) return;
      const subRaw = p.ticketSubject?.trim();
      const who = p.senderDisplayName?.trim();
      const subPreview = subRaw
        ? subRaw.length > 72
          ? `${subRaw.slice(0, 72)}…`
          : subRaw
        : null;

      if (!user.is_staff) {
        if (p.senderType !== 'admin') return;
        if (p.ownerUserId !== user.id) return;
        const line = who ? `@${who} replied` : 'Support replied';
        const tail = subPreview ? ` on "${subPreview}"` : ` on ticket #${p.ticketId}`;
        const tid = `open-owner-ticket-${p.ticketId}-${p.message?.id ?? 'm'}`;
        showSuccessClickable(
          `${line}${tail} — click to open chat.`,
          () => navigate(`/tickets/my?openTicket=${p.ticketId}`),
          tid
        );
        return;
      }

      if (p.senderType !== 'user') return;
      const whoPart = who ? ` from @${who}` : '';
      const subPart = subPreview ? ` — "${subPreview}"` : '';
      const tid = `open-staff-ticket-${p.ticketId}-${p.message?.id ?? 'm'}`;
      showSuccessClickable(
        `New message${whoPart} (user #${p.ownerUserId})${subPart} (#${p.ticketId}). Click to open.`,
        () => navigate(`/admin/tickets?openTicket=${p.ticketId}`),
        tid
      );
    };

    socket.on('new_message', onNewMessageToast);
    socket.on('status_updated', onStatusUpdated);
    socket.on('force_logout', onForceLogout);

    return () => {
      if (onNewTicketToast) socket.off('ticket_updated', onNewTicketToast);
      socket.off('new_message', onNewMessageToast);
      socket.off('status_updated', onStatusUpdated);
      socket.off('force_logout', onForceLogout);
    };
  }, [user, logout, navigate, isLoading, pathname]);

  return null;
};
