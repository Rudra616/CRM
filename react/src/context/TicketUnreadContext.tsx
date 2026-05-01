import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SessionGate } from '../shared/utils/sessionGate';
import {
  getMyTicketUnreadSummaryApi,
  getStaffTicketUnreadSummaryApi,
} from '../modules/ticket/api/ticket.api';
import { usePermissions } from './PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../shared/utils/permissionModules';

export interface TicketUnreadSummary {
  ticketsWithUnread: number;
  unreadMessageCount: number;
}

interface TicketUnreadContextValue {
  summary: TicketUnreadSummary;
  refreshTicketUnread: () => Promise<void>;
}

const TicketUnreadContext = createContext<TicketUnreadContextValue | null>(null);

export const TicketUnreadProvider = ({
  gate,
  children,
}: {
  gate: SessionGate;
  children: ReactNode;
}) => {
  const { getModulePerm, permLoading } = usePermissions();
  /** Same rule as `GET /tickit/staff-unread-summary` — backend uses ticket → can_add; do not call without it. */
  const ticketCanAdd = getModulePerm(PERMISSION_MODULE_KEYS.TICKET).can_add;

  const [summary, setSummary] = useState<TicketUnreadSummary>({
    ticketsWithUnread: 0,
    unreadMessageCount: 0,
  });

  const refreshTicketUnread = useCallback(async () => {
    if (gate !== 'member' && gate !== 'owner' && gate !== 'delegate') return;

    if (gate === 'member') {
      try {
        const res = await getMyTicketUnreadSummaryApi();
        if (res.data) {
          setSummary({
            ticketsWithUnread: res.data.tickets_with_unread ?? 0,
            unreadMessageCount: res.data.unread_message_count ?? 0,
          });
        }
      } catch {
        setSummary({ ticketsWithUnread: 0, unreadMessageCount: 0 });
      }
      return;
    }

    if (gate === 'delegate') {
      if (permLoading) return;
      if (!ticketCanAdd) {
        setSummary({ ticketsWithUnread: 0, unreadMessageCount: 0 });
        return;
      }
    }

    try {
      const res = await getStaffTicketUnreadSummaryApi();
      if (res.data) {
        setSummary({
          ticketsWithUnread: res.data.tickets_with_unread ?? 0,
          unreadMessageCount: res.data.unread_message_count ?? 0,
        });
      }
    } catch {
      setSummary({ ticketsWithUnread: 0, unreadMessageCount: 0 });
    }
  }, [gate, permLoading, ticketCanAdd]);

  useEffect(() => {
    void refreshTicketUnread();
  }, [refreshTicketUnread]);

  const value = useMemo(
    () => ({ summary, refreshTicketUnread }),
    [summary, refreshTicketUnread]
  );

  return <TicketUnreadContext.Provider value={value}>{children}</TicketUnreadContext.Provider>;
};

export const useTicketUnread = (): TicketUnreadContextValue => {
  const ctx = useContext(TicketUnreadContext);
  if (!ctx) {
    return {
      summary: { ticketsWithUnread: 0, unreadMessageCount: 0 },
      refreshTicketUnread: async () => {},
    };
  }
  return ctx;
};
