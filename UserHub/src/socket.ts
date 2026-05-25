import type { Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";
import { verifyToken } from "./common/helpers/common.helper";
import { findAdminById } from "./modules/admin/service/admin.service";
import { isMainAdminRow } from "./common/utils/adminIdentity";

/**
 * Constants representing socket events.
 */
export const SOCKET_EVENTS = {
  TICKET_MSG: "ticket_msg",
  TICKET_STATUS: "ticket_status",
  TICKET_COUNT: "ticket_count",
  TICKET_NEW: "ticket_new",
  SESSION_ENDED: "session_ended",
  USER_STATUS: "user_status",
} as const;

// Stores the currently active main admin socket (only one admin connection allowed at a time)
let mainAdminSocket: Socket | null = null;

// Stores all connected users and their active sockets (supports multiple devices/tabs per user)
// Structure: userId → Set of socket connections
const userSockets = new Map<number, Set<Socket>>();

/**
 * Extracts token from cookies string.
 * @param cookie - The cookie header string.
 * @returns The decoded token string or null if not found.
 */
const tokenFromCookie = (cookie?: string): string | null => {
  if (!cookie) return null;
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
};

/**
 * Adds a socket to the user's socket set.
 * @param userId - The user's ID.
 * @param socket - The socket instance.
 */
const addUserSocket = (userId: number, socket: Socket): void => {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(socket);
};

/**
 * Removes a socket from tracking maps.
 * @param socket - The socket instance.
 * @param userId - The user ID associated with the socket.
 * @param isMainAdmin - Whether the socket belongs to the main admin.
 */
const removeSocket = (socket: Socket, userId: number, isMainAdmin: boolean): void => {
  if (isMainAdmin && mainAdminSocket?.id === socket.id) {
    mainAdminSocket = null;
    return;
  }
  const set = userSockets.get(userId);
  set?.delete(socket);
  if (set?.size === 0) userSockets.delete(userId);
};

/**
 * Emits an event to all sockets of a specific user.
 * @param userId - The user's ID.
 * @param event - The socket event name.
 * @param payload - The data to send.
 */
const emitToUser = (userId: number, event: string, payload: unknown): void => {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const s of set) {
    s.emit(event, payload);
  }
};

/**
 * Initializes the Socket.IO server.
 * @param httpServer - The HTTP server to attach Socket.IO to.
 * @returns The Socket.IO server instance.
 */
export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  io.on("connection", async (socket) => {
    console.log("Connected:", socket.id);

    const token = tokenFromCookie(socket.handshake.headers.cookie);
    if (!token) {
      socket.disconnect(true);
      return;
    }

    let userId;
    try {
      const decoded = verifyToken(token) as { id?: number };
      userId = Number(decoded?.id);
    } catch {
      socket.disconnect(true);
      return;
    }

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    const adminRow = await findAdminById(userId);
    let isMainAdmin = false;

    if (adminRow) {
      if (!isMainAdminRow(adminRow)) {
        socket.disconnect(true);
        return;
      }
      isMainAdmin = true;
      if (mainAdminSocket) mainAdminSocket.disconnect(true);
      mainAdminSocket = socket;
    } else {
      addUserSocket(userId, socket);
    }

    socket.on("reconnect_attempt", () => {
      console.log("Reconnect trying:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected:", socket.id, reason);
      removeSocket(socket, userId, isMainAdmin);
    });
  });

  return io;
};

/**
 * Emits a socket event to the relevant user(s) and the main admin.
 * @param event - The socket event name.
 * @param data - The event payload.
 */
export const emitSocket = (event: string, data: Record<string, unknown>): void => {
  switch (event) {
    case SOCKET_EVENTS.TICKET_MSG: {
      const ownerUserId = Number(data.ownerUserId);
      const ticketId = Number(data.ticketId);
      const body = { ticketId, message: data.message };
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_MSG, body);
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_MSG, body);
      break;
    }
    case SOCKET_EVENTS.TICKET_STATUS: {
      const ownerUserId = Number(data.ownerUserId);
      const body = {
        ticketId: Number(data.ticketId),
        status: String(data.status),
      };
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_STATUS, body);
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_STATUS, body);
      break;
    }
    case SOCKET_EVENTS.TICKET_COUNT: {
      const ownerUserId = Number(data.ownerUserId);
      const ticketId = Number(data.ticketId);
      emitToUser(ownerUserId, SOCKET_EVENTS.TICKET_COUNT, { ticketId });
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_COUNT, { ticketId });
      break;
    }
    case SOCKET_EVENTS.TICKET_NEW:
      mainAdminSocket?.emit(SOCKET_EVENTS.TICKET_NEW, data);
      break;
    case SOCKET_EVENTS.SESSION_ENDED:
      emitToUser(Number(data.userId), SOCKET_EVENTS.SESSION_ENDED, {});
      break;
    case SOCKET_EVENTS.USER_STATUS:
      emitToUser(Number(data.userId), SOCKET_EVENTS.USER_STATUS, { status: data.status });
      break;
    default:
      break;
  }
};