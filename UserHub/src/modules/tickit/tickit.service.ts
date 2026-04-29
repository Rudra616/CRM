import db from "../../config/db";
import { logServiceError } from "../../common/helpers/serviceError";
import {
  CreateTicketInput,
  CreateTicketMessageInput,
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
      ? "WHERE user_id = ? AND (subject LIKE ? OR description LIKE ? OR status LIKE ?)"
      : "WHERE user_id = ?";
    const args = search ? [userId, like, like, like] : [userId];

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS total FROM \`ticket\` ${where}`,
      args
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, image_url, created_at, updated_at
       FROM \`ticket\`
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    return { items: rows as TicketRow[], total };
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
         u.username AS owner_username,
         u.first_name AS owner_first_name,
         u.last_name AS owner_last_name
       ${from}
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    return { items: rows as TicketRow[], total };
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
    const [result]: any = await db.query(
      `INSERT INTO \`ticket_message\` (ticket_id, sender_id, sender_type, message,image) VALUES (?, ?, ?, ?, ?)`,
      [messageData.ticket_id, messageData.sender_id, messageData.sender_type, messageData.message,messageData.image ?? null,
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