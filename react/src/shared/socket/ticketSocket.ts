import { io, Socket } from 'socket.io-client';
import type {
  NewMessageEvent as NewMessageSocketEvent,
  TicketUpdatedEvent as TicketUpdatedSocketEvent,
  StatusEvent as StatusUpdatedSocketEvent,
  AdminBroadcastEvent as AdminBroadcastSocketEvent,
  BroadcastRemovedEvent as BroadcastRemovedSocketEvent,
  BulkImportFinishedEvent as BulkImportFinishedSocketEvent,
} from './type';

export type {
  NewMessageSocketEvent,
  TicketUpdatedSocketEvent,
  StatusUpdatedSocketEvent,
  AdminBroadcastSocketEvent,
  BroadcastRemovedSocketEvent,
  BulkImportFinishedSocketEvent,
};

/** Client Socket.IO lifecycle callbacks (`socket.io-client`). */
export type TicketSocketLifecycleHandlers = {
  /** Fired when the connection is established (initial connect or after reconnect). */
  onConnect?: () => void;
  /** Fired when the connection is lost. */
  onDisconnect?: (reason: string) => void;
  /** Connection or handshake auth failed. */
  onConnectError?: (error: Error) => void;
  /** Client is about to disconnect (e.g. before `disconnect()`). */
  onDisconnecting?: (reason: string) => void;
  /** Fired after a successful reconnect (Socket.IO manager). */
  onReconnect?: (attempt: number) => void;
};

let ticketSocket: Socket | null = null;
let lifecycleAttached = false;
const lifecycleSubscribers = new Set<TicketSocketLifecycleHandlers>();

const resolveSocketUrl = (): string => {
  const explicit = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
  if (explicit) return explicit;
  const backend = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  if (backend) return backend;
  return 'http://localhost:3000';
};

const notifyLifecycle = <K extends keyof TicketSocketLifecycleHandlers>(
  key: K,
  ...args: Parameters<NonNullable<TicketSocketLifecycleHandlers[K]>>
): void => {
  for (const handlers of lifecycleSubscribers) {
    const fn = handlers[key];
    if (fn) (fn as (...a: typeof args) => void)(...args);
  }
};

const logLifecycle = (
  event: 'connect' | 'disconnect' | 'connect_error' | 'disconnecting' | 'reconnect',
  detail?: string
): void => {
  if (!import.meta.env.DEV) return;
  const suffix = detail ? ` — ${detail}` : '';
  console.info(`[ticket-socket] ${event}${suffix}`);
};

/** Subscribe to client lifecycle events. Returns an unsubscribe function. */
export const onTicketSocketLifecycle = (
  handlers: TicketSocketLifecycleHandlers
): (() => void) => {
  lifecycleSubscribers.add(handlers);
  return () => {
    lifecycleSubscribers.delete(handlers);
  };
};

/** Whether the shared ticket socket is currently connected. */
export const isTicketSocketConnected = (): boolean => ticketSocket?.connected ?? false;

const attachTicketSocketLifecycle = (socket: Socket): void => {
  if (lifecycleAttached) return;
  lifecycleAttached = true;

  socket.on('connect', () => {
    logLifecycle('connect', `id=${socket.id ?? 'unknown'}`);
    notifyLifecycle('onConnect');
  });

  socket.on('disconnect', (reason) => {
    logLifecycle('disconnect', reason);
    notifyLifecycle('onDisconnect', reason);
  });

  socket.on('connect_error', (error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    logLifecycle('connect_error', err.message);
    notifyLifecycle('onConnectError', err);
  });

  socket.on('disconnecting', (reason) => {
    logLifecycle('disconnecting', reason);
    notifyLifecycle('onDisconnecting', reason);
  });

  socket.io.on('reconnect', (attempt) => {
    logLifecycle('reconnect', `attempt=${attempt}`);
    notifyLifecycle('onReconnect', attempt);
  });
};

export const getTicketSocket = (): Socket => {
  if (ticketSocket) return ticketSocket;
  ticketSocket = io(resolveSocketUrl(), {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    // transports: ['websocket'],
  });
  attachTicketSocketLifecycle(ticketSocket);

  return ticketSocket;
};

export const disconnectTicketSocket = (): void => {
  if (!ticketSocket) return;
  ticketSocket.removeAllListeners();
  ticketSocket.io.removeAllListeners();
  ticketSocket.disconnect();
  ticketSocket = null;
  lifecycleAttached = false;
};
