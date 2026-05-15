import { io, Socket } from 'socket.io-client';
import type {
  NewMessageEvent as NewMessageSocketEvent,
  TicketUpdatedEvent as TicketUpdatedSocketEvent,
  StatusEvent as StatusUpdatedSocketEvent,
  AdminBroadcastEvent as AdminBroadcastSocketEvent,
  BroadcastRemovedEvent as BroadcastRemovedSocketEvent,
} from './type';

export type {
  NewMessageSocketEvent,
  TicketUpdatedSocketEvent,
  StatusUpdatedSocketEvent,
  AdminBroadcastSocketEvent,
  BroadcastRemovedSocketEvent,
};

let ticketSocket: Socket | null = null;

const resolveSocketUrl = (): string => {
  const explicit = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const backend = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  if (backend) return backend;
  return 'http://localhost:3000';
};

export const getTicketSocket = (): Socket => {
  if (ticketSocket) return ticketSocket;
  ticketSocket = io(resolveSocketUrl(), {
    withCredentials: true,
    autoConnect: true,
    // transports: ['websocket'],
  });

  return ticketSocket;
};

export const disconnectTicketSocket = (): void => {
  if (!ticketSocket) return;
  ticketSocket.removeAllListeners();
  ticketSocket.disconnect();
  ticketSocket = null;
};
