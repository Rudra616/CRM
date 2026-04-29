import type { TicketItem, TicketStatus } from '../types/ticket.types';

export const STATUS_OPTIONS: TicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export const statusBadgeClass = (status: TicketStatus): string => {
  if (status === 'open') return 'bg-primary';
  if (status === 'in_progress') return 'bg-warning text-dark';
  if (status === 'resolved') return 'bg-success';
  return 'bg-secondary';
};

/** Staff list: show name + @username instead of raw user id. */
export const formatTicketOwner = (ticket: TicketItem): string => {
  const first = ticket.owner_first_name?.trim() ?? '';
  const last = ticket.owner_last_name?.trim() ?? '';
  const name = [first, last].filter(Boolean).join(' ').trim();
  const uname = ticket.owner_username?.trim();
  const parts: string[] = [];
  if (name) parts.push(name);
  if (uname) parts.push(`@${uname}`);
  if (parts.length) return parts.join(' · ');
  return `User #${ticket.user_id}`;
};
