export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketItem {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  image_url?: string | null;
  status: TicketStatus;
  created_at?: string;
  updated_at?: string;
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

