import type { TicketMessageItem } from '../types/ticket.types';

export const mergeTicketMessage = (prev: TicketMessageItem[], msg: TicketMessageItem): TicketMessageItem[] => {
  if (prev.some((m) => m.id === msg.id)) return prev;
  const withoutOptimistic = prev.filter(
    (m) => !(m.id > 1_000_000_000_000 && m.sender_id === msg.sender_id && m.message === msg.message)
  );
  return [...withoutOptimistic, msg];
};
