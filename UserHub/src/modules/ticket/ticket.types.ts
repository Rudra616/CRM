export type TicketStatus = "open" | "closed";

export interface TicketRow {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
  /** Owner list: count of admin messages not yet read by ticket owner */
  unread_from_admin_count?: number;
  /** Staff list: count of user messages not yet read by staff */
  unread_from_user_count?: number;
  /** Populated on staff “all tickets” list via JOIN to `user` */
  owner_username?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
}

export interface TicketMessageRow {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_type: "user" | "admin";
  message: string;
  created_at?: Date;
  /** 1 if ticket owner has seen this message (admin messages start at 0 until owner opens thread) */
  is_read_by_user?: number;
  /** 1 if staff has seen this message (user messages start at 0 until staff opens thread) */
  is_read_by_admin?: number;
}

export interface TicketMessageView extends TicketMessageRow {
  sender_username?: string | null;
  image?: string | null;
}

export interface CreateTicketInput {
  user_id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  image_url?: string | null;
}

export interface CreateTicketMessageInput {
  ticket_id: number;
  sender_id: number;
  sender_type: "user" | "admin";
  message: string;
  image?: string | null;
}

export interface TicketListQuery {
  page: number;
  limit: number;
  search: string;
}

export interface TicketListResult {
  items: TicketRow[];
  total: number;
}

export interface OwnerTicketUnreadSummary {
  unread_message_count: number;
  tickets_with_unread: number;
}

export interface StaffTicketUnreadSummary {
  unread_message_count: number;
  tickets_with_unread: number;
}

