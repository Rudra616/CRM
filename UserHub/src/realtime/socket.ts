import { createServer } from "http";
import { Socket, Server } from "socket.io";
import { verifyToken } from "../common/helpers/common.helper";
import { findAdminToken, findUserToken } from "../modules/token.service";
import { StatusEvent, SocketUser, NewMessageEvent, TicketUpdatedEvent } from "./type";


let io: Server | null = null;

/**
 * 
 * @param cookieHeader 
 * @returns 
 */
const parseCookieToken = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith("token=")) {
      return decodeURIComponent(part.slice("token=".length));
    }
  }
  return null;
};

const resolveSocketUser = async (token: string): Promise<SocketUser | null> => {
  const decoded = verifyToken(token) as { id: number };
  const userTokenRow = await findUserToken(token);
  const adminTokenRow = await findAdminToken(token);

  if (!userTokenRow && !adminTokenRow) return null;
  return {
    id: Number(decoded.id),
    is_staff: Boolean(adminTokenRow),
  };
};

const emitToTicketAudience = (ownerUserId: number, event: string, payload: unknown): void => {
  if (!io) return;
  io.to(`user:${ownerUserId}`).emit(event, payload);
  io.to("staff").emit(event, payload);
};

export const initSocketServer = (server: ReturnType<typeof createServer>): Server => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = parseCookieToken(socket.handshake.headers.cookie);
      if (!token) return next(new Error("Unauthorized"));
      const user = await resolveSocketUser(token);
      if (!user) return next(new Error("Unauthorized"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${user.id}`);
    if (user.is_staff) {
      socket.join("staff");
    }
  });

  return io;
};

export const emitNewMessage = (event: NewMessageEvent): void => {
  emitToTicketAudience(event.ownerUserId, "new_message", event);
};

export const emitTicketUpdated = (event: TicketUpdatedEvent): void => {
  emitToTicketAudience(event.ownerUserId, "ticket_updated", event);
};


export const emitStatusUpdate = (event: StatusEvent): void => {
  if (!io) return;

  switch (event.type) {
    case "user_status":
      // 👤 affected user + staff should know user status changes
      io.to(`user:${event.userId}`).emit("status_updated", event);
      io.to("staff").emit("status_updated", event);
      break;

    case "ticket_status":
      // 🎫 user + staff both should know ticket updates
      io.to(`user:${event.ownerUserId}`).emit("status_updated", event);
      io.to("staff").emit("status_updated", event);
      break;
  }
};

export const emitUserLogout = (event: { userId: number }): void => {
  if (!io) return;

  // logout all user devices/tabs
  io.to(`user:${event.userId}`).emit("force_logout", event);

  // notify staff dashboard
  io.to("staff").emit("user_logged_out", event);
};