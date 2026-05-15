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
import { PERMISSION_MODULE_KEYS } from '../shared/utils/permissionModules';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionContext';

/**
 * Listens for `force_logout` / inactive `user_status`, and ticket events. Member broadcast UI uses `MemberBroadcastDock` + Socket.IO `admin_broadcast`.
 * Staff: open Socket.IO after permissions load when the user has ticket `can_add` **or** any User module permission (user management / status / logout signals).
 * Ticket toasts (`ticket_updated`, staff `new_message`) stay limited to ticket `can_add`.
 */
export const TicketSocketSession = () => {
  const { user, logout, isLoading } = useAuth();
  const { getModulePerm, permLoading } = usePermissions();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const ticketPerm = getModulePerm(PERMISSION_MODULE_KEYS.TICKET);
  const userPerm = getModulePerm(PERMISSION_MODULE_KEYS.USER);
  const ticketCanAdd = ticketPerm.can_add;
  const staffSocketAllowed =
    ticketCanAdd ||
    userPerm.can_view ||
    userPerm.can_add ||
    userPerm.can_edit ||
    userPerm.can_delete;

  useEffect(() => {
    if (isLoading || !user || isPublicAuthPath(pathname)) {
      disconnectTicketSocket();
      return;
    }

    if (user.is_staff) {
      if (permLoading) return;
      if (!staffSocketAllowed) {
        disconnectTicketSocket();
        return;
      }
    }

    const socket = getTicketSocket();

    const endSession = () => {
      const pathWhenEnding = window.location.pathname;
      void logout().finally(() => {
        navigate(buildSessionEndedLoginUrl(pathWhenEnding), { replace: true });
      });
    };

    const onStatusUpdated = (payload: StatusUpdatedSocketEvent) => {
      if (payload.type !== 'user_status') return;
      if (payload.userId !== user.id) return;
      if (payload.status === 'active') return;
      endSession();
    };

    const onForceLogout = (payload?: { userId?: number }) => {
      const uid = payload?.userId;
      if (uid != null && Number(uid) !== Number(user.id)) return;
      endSession();
    };

    let onNewTicketToast: ((p: TicketUpdatedSocketEvent) => void) | undefined;
    if (user.is_staff && ticketCanAdd) {
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

      if (!ticketCanAdd) return;
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
  }, [user, logout, navigate, isLoading, pathname, permLoading, staffSocketAllowed, ticketCanAdd]);

  return null;
};

