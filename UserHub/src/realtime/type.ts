
  export type SocketUser = {
    id: number;
    is_staff: boolean;
  };

  export type NewMessageEvent = {
    ticketId: number;
    ownerUserId: number;
    senderId: number;
    senderType: "user" | "admin";
    message?: {
      id: number;
      ticket_id: number;
      sender_id: number;
      sender_type: "user" | "admin";
      sender_username?: string | null;
      message: string;
      image?: string | null;
      created_at: string;
      is_read_by_user: number;
      is_read_by_admin: number;
    };
  };

  export type TicketUpdatedEvent = {
    ticketId: number;
    ownerUserId: number;
    status?: "open" | "closed";
    updatedBy?: "user" | "admin";
    updatedById?: number;
  };
  export type StatusEvent =
    | {
        type: "user_status";
        userId: number;
        status: "active" | "pending" | "inactive";
        updatedById: number;
      }
    | {
        type: "ticket_status";
        ticketId: number;
        ownerUserId: number;
        status: "open" | "closed";
        updatedById: number;
      };


      
  