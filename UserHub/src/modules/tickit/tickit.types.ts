export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketRow {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
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

