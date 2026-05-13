import { createServer } from "http";
import { Socket, Server } from "socket.io";
import { verifyToken } from "../common/helpers/common.helper";
import { findAdminToken, findUserToken } from "../modules/token.service";
import { findAdminById, getActiveAdminIds } from "../modules/admin/service/admin.service";
import { getPermissionByRoleAndModule } from "../common/permission.service";
import { isMainAdminRow } from "../common/utils/adminIdentity";
import { SocketEmit, SocketUser } from "./type";

let io: Server | null = null;

const userRoom = (id: number): string => `user:${id}`;

const emitOne = (userId: number, channel: string, payload: unknown): void => {
  if (!io) return;
  io.to(userRoom(userId)).emit(channel, payload);
};

const emitToEachAdmin = async (channel: string, payload: unknown): Promise<void> => {
  const ids = await getActiveAdminIds();
  for (const id of ids) emitOne(id, channel, payload);
};

const hasModuleSocketAccess = (row: {
  can_view?: number;
  can_add?: number;
  can_edit?: number;
} | null): boolean => {
  if (!row) return false;
  return row.can_view === 1 || row.can_add === 1 || row.can_edit === 1;
};

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

/** Staff socket access: main admin, or ticket module any of view/add/edit, or user module same (aligned with previous connection check). */
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

export const initSocketServer = (server: ReturnType<typeof createServer>): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

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

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) {
      socket.disconnect();
      return;
    }
    socket.join(userRoom(user.id));
  });

  return io;
};

/** Drops every socket in `user:${userId}` (e.g. after `force_logout`). */
export const disconnectSocketsInUserRoom = (userId: number): void => {
  if (!io) return;
  io.in(userRoom(userId)).disconnectSockets(true);
};

export const emitSocket = async (dispatch: SocketEmit): Promise<void> => {
  if (!io) return;

  switch (dispatch.name) {
    case "new_message": {
      const p = dispatch.payload;
      emitOne(p.ownerUserId, "new_message", p);
      if (p.senderType === "user") await emitToEachAdmin("new_message", p);
      break;
    }

    case "ticket_updated": {
      const p = dispatch.payload;
      emitOne(p.ownerUserId, "ticket_updated", p);
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
      const payload = { userId: uid };
      emitOne(uid, "force_logout", payload);
      setImmediate(() => disconnectSocketsInUserRoom(uid));
      break;
    }
  }
};
