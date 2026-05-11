import { io, Socket } from "socket.io-client";

export type NewMessageSocketEvent = {
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

export type TicketUpdatedSocketEvent = {
  ticketId: number;
  ownerUserId: number;
  status?: "open" | "closed";
  updatedBy?: "user" | "admin";
  updatedById?: number;
};

export type StatusUpdatedSocketEvent =
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

let ticketSocket: Socket | null = null;

// Helper function to determine socket URL based on environment variable or default
const resolveSocketUrl = (): string => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim();
  return "http://localhost:3000";
};

// Initialize and return the ticket socket instance, ensuring only one instance is created
export const getTicketSocket = (): Socket => {
  if (ticketSocket) return ticketSocket;
  // Create a new Socket.IO client instance with the resolved URL and connection options
  ticketSocket = io(resolveSocketUrl(), {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket"],
  });

  return ticketSocket;
};

// Clean up the ticket socket connection by removing all listeners and disconnecting
export const disconnectTicketSocket = (): void => {
  if (!ticketSocket) return;
  ticketSocket.removeAllListeners();
  ticketSocket.disconnect();
  ticketSocket = null;
};
