import {
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

import type { TicketMessageItem } from '../modules/ticket/types/ticket.types';
import {
  bumpUnreadSummary,
  dropUnreadSummary,
} from '../modules/ticket/utils/applySocketTicketMessage';

export interface TicketUnreadSummary {
  ticketsWithUnread: number;
  unreadMessageCount: number;
}

interface TicketUnreadContextValue {
  summary: TicketUnreadSummary;
  refreshTicketUnread: () => Promise<void>;
  /** Decrease sidebar counts when unread on a ticket was cleared (no API). */
  dropTicketUnread: (clearedMessages: number) => void;
  bumpTicketUnread: (
    message: TicketMessageItem,
    viewer: 'member' | 'staff',
    ticketHadUnreadBefore: boolean
  ) => void;
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
  /** Same rule as `GET /ticket/staff-unread-summary` — backend uses ticket → can_add; do not call without it. */
  const ticketCanAdd = getModulePerm(PERMISSION_MODULE_KEYS.TICKET).can_add;

  const [summary, setSummary] = useState<TicketUnreadSummary>({
    ticketsWithUnread: 0,
    unreadMessageCount: 0,
  });

  const loadMemberSummary = useCallback(async () => {
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
  }, []);

  const loadStaffSummary = useCallback(async () => {
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
  }, []);

  const dropTicketUnread = useCallback((clearedMessages: number) => {
    setSummary((prev) => dropUnreadSummary(prev, clearedMessages));
  }, []);

  const bumpTicketUnread = useCallback(
    (message: TicketMessageItem, viewer: 'member' | 'staff', ticketHadUnreadBefore: boolean) => {
      setSummary((prev) => bumpUnreadSummary(prev, message, viewer, ticketHadUnreadBefore));
    },
    []
  );

  const refreshTicketUnread = useCallback(async () => {
    if (gate === 'member') {
      await loadMemberSummary();
      return;
    }

    if (permLoading) return;
    if (!ticketCanAdd) {
      setSummary({ ticketsWithUnread: 0, unreadMessageCount: 0 });
      return;
    }
    await loadStaffSummary();
  }, [gate, permLoading, ticketCanAdd, loadMemberSummary, loadStaffSummary]);

  useEffect(() => {
    if (gate !== 'member') return;
    void loadMemberSummary();
  }, [gate, loadMemberSummary]);

  useEffect(() => {
    if (gate !== 'staff') return;
    if (permLoading) return;
    if (!ticketCanAdd) {
      setSummary({ ticketsWithUnread: 0, unreadMessageCount: 0 });
      return;
    }
    void loadStaffSummary();
  }, [gate, permLoading, ticketCanAdd, loadStaffSummary]);

  const value = useMemo(
    () => ({ summary, refreshTicketUnread, dropTicketUnread, bumpTicketUnread }),
    [summary, refreshTicketUnread, dropTicketUnread, bumpTicketUnread]
  );

  return <TicketUnreadContext.Provider value={value}>{children}</TicketUnreadContext.Provider>;
};

export const useTicketUnread = (): TicketUnreadContextValue => {
  const ctx = useContext(TicketUnreadContext);
  if (!ctx) {
    return {
      summary: { ticketsWithUnread: 0, unreadMessageCount: 0 },
      refreshTicketUnread: async () => {},
      dropTicketUnread: () => {},
      bumpTicketUnread: () => {},
    };
  }
  return ctx;
};
