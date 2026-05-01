import db from "../../config/db";
import { logServiceError } from "../../common/helpers/serviceError";
import {
  CreateTicketInput,
  CreateTicketMessageInput,
  OwnerTicketUnreadSummary,
  StaffTicketUnreadSummary,
  TicketListQuery,
  TicketListResult,
  TicketMessageView,
  TicketRow,
  TicketStatus,
} from "./tickit.types";

export const insertTicket = async (ticketData: CreateTicketInput): Promise<number> => {
  try {
    const [result]: any = await db.query(
      `INSERT INTO \`ticket\` (user_id, subject, description, status, image_url) VALUES (?, ?, ?, ?, ?)`,
      [
        ticketData.user_id,
        ticketData.subject,
        ticketData.description,
        ticketData.status,
        ticketData.image_url ?? null,
      ]
    );
    return result.insertId;
  } catch (error: unknown) {
    logServiceError("tickit.service", "insertTicket", error);
    throw error;
  }
};

export const getTicketsByUserId = async (userId: number): Promise<TicketRow[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, image_url, created_at, updated_at
       FROM \`ticket\`
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("tickit.service", "getTicketsByUserId", error);
    throw error;
  }
};

export const getTicketsByUserIdPaged = async (
  userId: number,
  q: TicketListQuery
): Promise<TicketListResult> => {
  try {
    const page = Math.max(1, q.page);
    const limit = Math.max(1, q.limit);
    const offset = (page - 1) * limit;
    const search = q.search.trim();
    const like = `%${search}%`;

    const where = search
      ? "WHERE t.user_id = ? AND (t.subject LIKE ? OR t.description LIKE ? OR t.status LIKE ?)"
      : "WHERE t.user_id = ?";
    const args = search ? [userId, like, like, like] : [userId];

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total FROM \`ticket\` t ${where}`,
      args
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const [rows]: any = await db.query(
      `SELECT
         t.id,
         t.user_id,
         t.subject,
         t.description,
         t.status,
         t.image_url,
         t.created_at,
         t.updated_at,
         (
           SELECT COUNT(*)
           FROM \`ticket_message\` tm
           WHERE tm.ticket_id = t.id
             AND tm.sender_type = 'admin'
             AND tm.is_read_by_user = 0
         ) AS unread_from_admin_count
       FROM \`ticket\` t
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    const items = (rows as TicketRow[]).map((row: TicketRow & { unread_from_admin_count?: unknown }) => ({
      ...row,
      unread_from_admin_count: Number(row.unread_from_admin_count ?? 0),
    }));

    return { items, total };
  } catch (error: unknown) {
    logServiceError("tickit.service", "getTicketsByUserIdPaged", error);
    throw error;
  }
};

export const getAllTickets = async (): Promise<TicketRow[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, image_url, created_at, updated_at
       FROM \`ticket\`
       ORDER BY created_at DESC`
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("tickit.service", "getAllTickets", error);
    throw error;
  }
};

export const getAllTicketsPaged = async (q: TicketListQuery): Promise<TicketListResult> => {
  try {
    const page = Math.max(1, q.page);
    const limit = Math.max(1, q.limit);
    const offset = (page - 1) * limit;
    const search = q.search.trim();
    const like = `%${search}%`;

    const from = `FROM \`ticket\` t
      LEFT JOIN \`user\` u ON u.id = t.user_id AND COALESCE(u.is_delete, 0) = 0`;

    const where = search
      ? `WHERE (
      t.subject LIKE ? OR t.description LIKE ? OR t.status LIKE ?
      OR CAST(t.id AS CHAR) LIKE ? OR CAST(t.user_id AS CHAR) LIKE ?
      OR u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
    )`
      : "";
    const args = search ? [like, like, like, like, like, like, like, like] : [];

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total ${from} ${where}`,
      args
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const [rows]: any = await db.query(
      `SELECT
         t.id,
         t.user_id,
         t.subject,
         t.description,
         t.status,
         t.image_url,
         t.created_at,
         t.updated_at,
         (
           SELECT COUNT(*)
           FROM \`ticket_message\` tm
           WHERE tm.ticket_id = t.id
             AND tm.sender_type = 'user'
             AND tm.is_read_by_admin = 0
         ) AS unread_from_user_count,
         u.username AS owner_username,
         u.first_name AS owner_first_name,
         u.last_name AS owner_last_name
       ${from}
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    const items = (rows as TicketRow[]).map((row: TicketRow & { unread_from_user_count?: unknown }) => ({
      ...row,
      unread_from_user_count: Number(row.unread_from_user_count ?? 0),
    }));

    return { items, total };
  } catch (error: unknown) {
    logServiceError("tickit.service", "getAllTicketsPaged", error);
    throw error;
  }
};


export const updateTicketByOwner = async (
  ticketId: number,
  ownerUserId: number,
  data: { subject: string; description: string; image_url?: string | null }
): Promise<boolean> => {
  try {
    if (data.image_url !== undefined) {
      const [result]: any = await db.query(
        `UPDATE \`ticket\`
         SET subject = ?, description = ?, image_url = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [data.subject, data.description, data.image_url, ticketId, ownerUserId]
      );
      return result.affectedRows > 0;
    }
    const [result]: any = await db.query(
      `UPDATE \`ticket\`
       SET subject = ?, description = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [data.subject, data.description, ticketId, ownerUserId]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("tickit.service", "updateTicketByOwner", error);
    throw error;
  }
};

export const insertTicketMessage = async (
  messageData: CreateTicketMessageInput
): Promise<number> => {
  try {
    const isReadByUser = messageData.sender_type === "admin" ? 0 : 1;
    const isReadByAdmin = messageData.sender_type === "user" ? 0 : 1;
    const [result]: any = await db.query(
      `INSERT INTO \`ticket_message\` (ticket_id, sender_id, sender_type, message, image, is_read_by_user, is_read_by_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        messageData.ticket_id,
        messageData.sender_id,
        messageData.sender_type,
        messageData.message,
        messageData.image ?? null,
        isReadByUser,
        isReadByAdmin,
      ]
    );
    return result.insertId;
  } catch (error: unknown) {
    logServiceError("tickit.service", "insertTicketMessage", error);
    throw error;
  }
};

export const getTicketById = async (ticketId: number): Promise<TicketRow | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, image_url, created_at, updated_at
       FROM \`ticket\`
       WHERE id = ?`,
      [ticketId]
    );
    return rows[0] ?? null;
  } catch (error) {
    logServiceError("tickit.service", "getTicketById", error);
    throw error;
  }
};

export const getTicketMessagesByTicketId = async (
  ticketId: number
): Promise<TicketMessageView[]> => {
  try {
    const [rows]: any = await db.query(
       `SELECT tm.id,
              tm.ticket_id,
              tm.sender_id,
              tm.sender_type,
              tm.message,
              tm.image,
              tm.is_read_by_user,
              tm.is_read_by_admin,
              tm.created_at,
              CASE
                WHEN tm.sender_type = 'admin' THEN a.username
                ELSE u.username
              END AS sender_username
       FROM \`ticket_message\` tm
       LEFT JOIN \`admin\` a ON tm.sender_type = 'admin' AND a.id = tm.sender_id
       LEFT JOIN \`user\` u ON tm.sender_type = 'user' AND u.id = tm.sender_id
       WHERE tm.ticket_id = ?
       ORDER BY tm.created_at ASC, tm.id ASC`,
      [ticketId]
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("tickit.service", "getTicketMessagesByTicketId", error);
    throw error;
  }
};

/** Mark all admin messages on this ticket as read by the ticket owner (opens chat). */
export const markAdminMessagesReadByOwner = async (
  ticketId: number,
  ownerUserId: number
): Promise<void> => {
  try {
    await db.query(
      `UPDATE \`ticket_message\` tm
       INNER JOIN \`ticket\` t ON t.id = tm.ticket_id AND t.user_id = ?
       SET tm.is_read_by_user = 1
       WHERE tm.ticket_id = ?
         AND tm.sender_type = 'admin'`,
      [ownerUserId, ticketId]
    );
  } catch (error: unknown) {
    logServiceError("tickit.service", "markAdminMessagesReadByOwner", error);
    throw error;
  }
};

/** Mark all user messages on this ticket as read by staff (opens chat). */
export const markUserMessagesReadByStaff = async (ticketId: number): Promise<void> => {
  try {
    await db.query(
      `UPDATE \`ticket_message\`
       SET is_read_by_admin = 1
       WHERE ticket_id = ?
         AND sender_type = 'user'`,
      [ticketId]
    );
  } catch (error: unknown) {
    logServiceError("tickit.service", "markUserMessagesReadByStaff", error);
    throw error;
  }
};

export const getOwnerTicketUnreadSummary = async (
  userId: number
): Promise<OwnerTicketUnreadSummary> => {
  try {
    const [rows]: any = await db.query(
      `SELECT
         COUNT(*) AS unread_message_count,
         COUNT(DISTINCT tm.ticket_id) AS tickets_with_unread
       FROM \`ticket_message\` tm
       INNER JOIN \`ticket\` t ON t.id = tm.ticket_id AND t.user_id = ?
       WHERE tm.sender_type = 'admin'
         AND tm.is_read_by_user = 0`,
      [userId]
    );
    const row = rows?.[0];
    return {
      unread_message_count: Number(row?.unread_message_count ?? 0),
      tickets_with_unread: Number(row?.tickets_with_unread ?? 0),
    };
  } catch (error: unknown) {
    logServiceError("tickit.service", "getOwnerTicketUnreadSummary", error);
    throw error;
  }
};

export const getStaffTicketUnreadSummary = async (): Promise<StaffTicketUnreadSummary> => {
  try {
    const [rows]: any = await db.query(
      `SELECT
         COUNT(*) AS unread_message_count,
         COUNT(DISTINCT tm.ticket_id) AS tickets_with_unread
       FROM \`ticket_message\` tm
       WHERE tm.sender_type = 'user'
         AND tm.is_read_by_admin = 0`
    );
    const row = rows?.[0];
    return {
      unread_message_count: Number(row?.unread_message_count ?? 0),
      tickets_with_unread: Number(row?.tickets_with_unread ?? 0),
    };
  } catch (error: unknown) {
    logServiceError("tickit.service", "getStaffTicketUnreadSummary", error);
    throw error;
  }
};

export const updateTicketStatusByOwner = async (
  ticketId: number,
  userId: number,
  status: TicketStatus
): Promise<boolean> => {
  const [result]: any = await db.query(
    `
    UPDATE ticket
    SET status = ?
    WHERE id = ?
    AND user_id = ?
    AND status != 'closed'
    `,
    [status, ticketId, userId]
  );

  return result.affectedRows > 0;
};
export const updateTicketStatusByAdmin = async (
  ticketId: number,
  status: TicketStatus
): Promise<boolean> => {
  const [result]: any = await db.query(
    `
    UPDATE ticket
    SET status = ?
    WHERE id = ?
    `,
    [status, ticketId]
  );

  return result.affectedRows > 0;
};