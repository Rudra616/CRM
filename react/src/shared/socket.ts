import { io, type Socket } from 'socket.io-client';

export const SOCKET_EVENTS = {
  TICKET_MSG: 'ticket_msg',
  TICKET_STATUS: 'ticket_status',
  TICKET_COUNT: 'ticket_count',
  TICKET_NEW: 'ticket_new',
  SESSION_ENDED: 'session_ended',
  USER_STATUS: 'user_status',
} as const;

let socket: Socket | null = null;

export const canUseSocket = (user: { is_staff?: boolean; is_main_admin?: boolean } | null): boolean =>
  !!user && (!user.is_staff || !!user.is_main_admin);

export const connectSocket = (): Socket => {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io({ path: '/socket.io', withCredentials: true, reconnection: true });
  socket.on('connect', () => console.log('Socket connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
  socket.io.on('reconnect_attempt', () => console.log('Socket reconnect trying...'));
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

/** Always attaches to the live socket (calls connectSocket first). */
export const onSocket = (event: string, fn: (data: unknown) => void): (() => void) => {
  const s = connectSocket();
  s.on(event, fn);
  return () => {
    s.off(event, fn);
  };
};
