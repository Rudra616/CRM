import { createServer } from "http";
import { Socket, Server } from "socket.io";
import { verifyToken } from "../common/helpers/common.helper";
import { findAdminToken, findUserToken } from "../modules/token.service";
import { findAdminById, getActiveAdminIds } from "../modules/admin/service/admin.service";
import { getPermissionByRoleAndModule } from "../common/permission.service";
import { isMainAdminRow } from "../common/utils/adminIdentity";
import { SocketEmit, SocketUser } from "./type";

/**
 * Global Socket.IO server instance.
 * Initialized once in `initSocketServer` and reused across emit functions.
 * Set to null until the server is started.
 */
let io: Server | null = null;

/**
 * Generates a unique room name for a specific user.
 * Used to isolate socket events per user (e.g. private messages, logout).
 *
 * @param id User ID
 * @returns Room name in format `user:{id}`
 */
const userRoom = (id: number): string => `user:${id}`;

/**
 * Room name used for global admin/user broadcasts.
 * All connected sockets join this room to receive system-wide events.
 */
const USER_BROADCAST_ROOM = "broadcast:users";
/**
 * Emits an event to a specific user's socket room.
 * Used for private events like messages, ticket updates, and logout.
 *
 * @param userId Target user ID
 * @param channel Socket event name
 * @param payload Data sent to the client
 */
const emitOne = (userId: number, channel: string, payload: unknown): void => {
  if (!io) return;
  io.to(userRoom(userId)).emit(channel, payload);
};

/**
 * Emits an event to all active admin sockets.
 * Fetches currently active admin IDs and sends the event individually.
 *
 * @param channel Socket event name
 * @param payload Data sent to each admin client
 */
const emitToEachAdmin = async (channel: string, payload: unknown): Promise<void> => {
  const ids = await getActiveAdminIds();
  for (const id of ids) emitOne(id, channel, payload);
};

/**
 * Emits an event to the global broadcast room.
 * Used for system-wide announcements visible to all connected users.
 *
 * @param channel Socket event name
 * @param payload Data sent to all clients in broadcast room
 */
const emitToBroadcastRoom = (channel: string, payload: unknown): void => {
  if (!io) return;

  io.to(USER_BROADCAST_ROOM).emit(channel, payload);
};

/**
 * Checks whether a role has socket-level module access.
 * Access is granted if user can view, add, or edit the module.
 *
 * @param row Permission row containing module access flags
 * @returns True if user has at least one permission, otherwise false
 */
const hasModuleSocketAccess = (row: {
  can_view?: number;
  can_add?: number;
  can_edit?: number;
} | null): boolean => {
  if (!row) return false;
  return row.can_view === 1 || row.can_add === 1 || row.can_edit === 1;
};

/**
 * Extracts authentication token from browser cookie header.
 * Looks for `token=` key in the cookie string.
 *
 * @param cookieHeader Raw cookie header from socket handshake
 * @returns Decoded token string if found, otherwise null
 */
const parseCookieToken = (cookieHeader?: string): string | null => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  // console.log("kahbsihb")
  for (const part of parts) {
    if (part.startsWith("token=")) {
      return decodeURIComponent(part.slice("token=".length));
    }
  }
  return null;
};

/**
 * Resolves a socket user from authentication token.
 * Verifies token, checks if it exists in user/admin token store,
 * and determines whether the user is staff.
 *
 * @param token JWT or session token from cookie
 * @returns Socket user object if valid, otherwise null
 */
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

/**
 * Validates whether a staff user is allowed to establish a socket connection.
 *
 * This check ensures:
 * - The admin exists and is active
 * - Main admin bypass is allowed
 * - Role is valid
 * - Role has at least one module permission (ticket or user) for socket access
 *
 * @param userId Admin user ID
 * @throws Error if the user is unauthorized or forbidden
 */
const assertStaffSocketAllowed = async (userId: number): Promise<void> => {
  const adminRow = await findAdminById(userId);
  if (!adminRow || adminRow.status !== "active") {
    throw new Error("Unauthorized");
  }
  if (isMainAdminRow(adminRow)) return;

  const roleId = adminRow.role_id != null ? Number(adminRow.role_id) : null;
  if (!roleId || roleId <= 0) {
    throw new Error("Forbidden");
  }

  const ticketPerm = await getPermissionByRoleAndModule(roleId, "ticket");
  const userModPerm = await getPermissionByRoleAndModule(roleId, "user");
  if (!hasModuleSocketAccess(ticketPerm) && !hasModuleSocketAccess(userModPerm)) {
    throw new Error("Forbidden");
  }
};

/**
 * Initializes and configures the Socket.IO server.
 * Sets up CORS, authentication middleware, and connection handling with room assignments.
 *
 * @param server HTTP server instance
 * @returns Configured Socket.IO server instance
 */
export const initSocketServer = (server: ReturnType<typeof createServer>): Server => {
   /**
   * Initializes Socket.IO server with CORS and attaches it to HTTP server.
   *
   * @param server HTTP server instance
   */

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  /**
   * Socket authentication middleware.
   * Validates user token and checks staff permissions before allowing connection.
   */
  
  io.use(async (socket: Socket, next) => {
    try {
      const token = parseCookieToken(socket.handshake.headers.cookie);
      if (!token) return next(new Error("Unauthorized"));
      const user = await resolveSocketUser(token);
      if (!user) return next(new Error("Unauthorized"));

      if (user.is_staff) {
        try {
          await assertStaffSocketAllowed(user.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unauthorized";
          return next(new Error(msg));
        }
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });
/**
 * Handles new socket connections.
 * Joins authenticated users into their personal room and broadcast room.
 */
  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) {
      socket.disconnect();
      return;
    }
  socket.join(userRoom(user.id));

  if (!user.is_staff) {
    socket.join(USER_BROADCAST_ROOM);
  }
  });

  return io;
};

/** Disconnects all active sockets belonging to a specific user.
 * Used to force logout the user across all devices/tabs.
 *
 * @param userId User ID whose sockets should be disconnected
 */
export const disconnectSocketsInUserRoom = (userId: number): void => {
  if (!io) return;
  io.in(userRoom(userId)).disconnectSockets(true);
};

/**
 * Central socket event dispatcher.
 * Routes different event types to specific users, admins, or broadcast rooms.
 *
 * @param dispatch Socket event payload containing event type and data
 */
export const emitSocket = async (dispatch: SocketEmit): Promise<void> => {
  if (!io) return;

  switch (dispatch.name) {
    case "new_message": {
      const p = dispatch.payload;
      emitOne(p.ownerUserId, "new_message", p);

      // If message is from user, notify all active admins
      if (p.senderType === "user") await emitToEachAdmin("new_message", p);
      break;
    }

    case "ticket_updated": {
      const p = dispatch.payload;

      // Notify ticket owner
      emitOne(p.ownerUserId, "ticket_updated", p);

      // Notify all admins
      await emitToEachAdmin("ticket_updated", p);
      break;
    }

    case "status": {
      const ev = dispatch.event;

      switch (ev.type) {
        case "user_status":
          emitOne(ev.userId, "status_updated", ev);
          await emitToEachAdmin("status_updated", ev);
          break;

        case "ticket_status":
          emitOne(ev.ownerUserId, "status_updated", ev);
          await emitToEachAdmin("status_updated", ev);
          break;
      }
      break;
    }

    case "user_logout": {
      const uid = dispatch.userId;

      // Notify user to logout
      emitOne(uid, "force_logout", { userId: uid });

      // Disconnect all user sockets after emit
      setImmediate(() => disconnectSocketsInUserRoom(uid));
      break;
    }

    case "broadcast_message": {
      // Send admin broadcast to all connected users
      emitToBroadcastRoom("admin_broadcast", dispatch.payload);
      break;
    }

    case "broadcast_removed": {
      // Notify all clients that a broadcast was removed
      emitToBroadcastRoom("broadcast_removed", dispatch.payload);
      break;
    }
  }
};
