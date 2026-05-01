export type TicketStatus = 'open' | 'closed';

export interface TicketItem {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  image_url?: string | null;
  status: TicketStatus;
  created_at?: string;
  updated_at?: string;
  /** Owner list: unread admin messages on this ticket */
  unread_from_admin_count?: number;
  /** Staff list: unread user messages on this ticket */
  unread_from_user_count?: number;
  /** Staff “all tickets” list (from user join) */
  owner_username?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
}

export interface TicketMessageItem {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_type: 'user' | 'admin';
  sender_username?: string | null;
  message: string;
  image?: string | null;
  created_at?: string;
  /** 1 after ticket owner has opened the thread (admin messages only tracked for unread) */
  is_read_by_user?: number;
  /** 1 after staff has opened the thread (user messages only tracked for unread) */
  is_read_by_admin?: number;
}

export interface TicketThreadResponse {
  ticket: TicketItem;
  messages: TicketMessageItem[];
}

export interface TicketListResponse {
  items: TicketItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    limitOptions?: number[];
  };
}

export interface OwnerTicketUnreadSummary {
  unread_message_count: number;
  tickets_with_unread: number;
}

export interface StaffTicketUnreadSummary {
  unread_message_count: number;
  tickets_with_unread: number;
}

