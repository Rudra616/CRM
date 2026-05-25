import type { TicketItem, TicketMessageItem } from '../types/ticket.types';

export type UnreadSummary = {
  ticketsWithUnread: number;
  unreadMessageCount: number;
};

/** Update list row unread badge when a socket message arrives (no API). */
export const applyTicketListOnMessage = (
  tickets: TicketItem[],
  ticketId: number,
  message: TicketMessageItem,
  viewer: 'member' | 'staff'
): TicketItem[] => {
  const id = Number(ticketId);
  return tickets.map((t) => {
    if (t.id !== id) return t;
    if (viewer === 'member' && message.sender_type === 'admin') {
      const n = Number(t.unread_from_admin_count ?? 0);
      return { ...t, unread_from_admin_count: n + 1 };
    }
    if (viewer === 'staff' && message.sender_type === 'user') {
      const n = Number(t.unread_from_user_count ?? 0);
      return { ...t, unread_from_user_count: n + 1 };
    }
    return t;
  });
};

export const isOwnSocketMessage = (
  message: TicketMessageItem,
  userId: number,
  isStaff: boolean
): boolean =>
  message.sender_id === userId &&
  ((isStaff && message.sender_type === 'admin') || (!isStaff && message.sender_type === 'user'));

/** Main admin: new ticket row without GET /ticket list. */
export const prependNewTicket = (
  tickets: TicketItem[],
  data: { ticketId: number; userId: number; subject: string }
): TicketItem[] => {
  const id = Number(data.ticketId);
  if (tickets.some((t) => t.id === id)) return tickets;
  const row: TicketItem = {
    id,
    user_id: Number(data.userId),
    subject: String(data.subject ?? ''),
    description: '',
    status: 'open',
    unread_from_user_count: 0,
  };
  return [row, ...tickets];
};

export const bumpUnreadSummary = (
  summary: UnreadSummary,
  message: TicketMessageItem,
  viewer: 'member' | 'staff',
  ticketHadUnreadBefore: boolean
): UnreadSummary => {
  if (viewer === 'member' && message.sender_type === 'admin') {
    return {
      unreadMessageCount: summary.unreadMessageCount + 1,
      ticketsWithUnread: ticketHadUnreadBefore
        ? summary.ticketsWithUnread
        : summary.ticketsWithUnread + 1,
    };
  }
  if (viewer === 'staff' && message.sender_type === 'user') {
    return {
      unreadMessageCount: summary.unreadMessageCount + 1,
      ticketsWithUnread: ticketHadUnreadBefore
        ? summary.ticketsWithUnread
        : summary.ticketsWithUnread + 1,
    };
  }
  return summary;
};

/** Sidebar badge goes down when a ticket’s unread messages are cleared (send/open chat). */
export const dropUnreadSummary = (
  summary: UnreadSummary,
  clearedMessages: number
): UnreadSummary => {
  if (clearedMessages <= 0) return summary;
  return {
    unreadMessageCount: Math.max(0, summary.unreadMessageCount - clearedMessages),
    ticketsWithUnread: Math.max(0, summary.ticketsWithUnread - 1),
  };
};
