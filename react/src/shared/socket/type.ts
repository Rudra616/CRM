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

  export type AdminBroadcastEvent = {
    id: number;
    message: string;
    created_at: string;
  };

  export type BroadcastRemovedEvent = {
    id: number;
  };

  /** Main admin bulk import finished (counts only, no row errors). */
  export type BulkImportFinishedEvent = {
    success: boolean;
    message: string;
    total: number;
    skippedValidation: number;
    submitted: number;
    inserted: number;
    updated: number;
    imported: number;
    notImported: number;
  };
