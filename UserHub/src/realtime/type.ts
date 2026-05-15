
  export type SocketUser = {
    id: number;
    is_staff: boolean;
  };

  export type NewMessageEvent = {
    ticketId: number;
    ownerUserId: number;
    senderId: number;
    senderType: "user" | "admin";
    /** For client toast / deep-link when the other party sends a message. */
    ticketSubject?: string;
    senderDisplayName?: string;
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
    kind?: "created";
    ownerUsername?: string;
    subject?: string;
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

  export type BroadcastMessageEvent = {
    id: number;
    message: string;
    created_at: string;
  };

  export type BroadcastRemovedEvent = {
    id: number;
  };

  /**
   * All server→client socket dispatches. `name` is the dispatch kind;
   * ticket rows use the same strings as the Socket.IO event on the wire.
   */
  export type SocketEmit =
    | { name: "new_message"; payload: NewMessageEvent }
    | { name: "ticket_updated"; payload: TicketUpdatedEvent }
    | { name: "status"; event: StatusEvent }
    | { name: "user_logout"; userId: number }
    | { name: "broadcast_message"; payload: BroadcastMessageEvent }
    | { name: "broadcast_removed"; payload: BroadcastRemovedEvent };


      
  