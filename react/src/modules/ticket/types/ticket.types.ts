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
}

export interface TicketMessageItem {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_type: 'user' | 'admin';
  sender_username?: string | null;
  message: string;
  created_at?: string;
}

export interface TicketThreadResponse {
  ticket: TicketItem;
  messages: TicketMessageItem[];
}

