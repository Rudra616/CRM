import db from "../../config/db";
import { logServiceError } from "../../common/helpers/serviceError";
import {
  CreateTicketInput,
  CreateTicketMessageInput,
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

export const updateTicketStatusService = async (
  ticketId: number,
  status: TicketStatus
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE `ticket` SET status = ? WHERE id = ?",
      [status, ticketId]
    );
    return result.affectedRows > 0;
  } catch (error: unknown) {
    logServiceError("tickit.service", "updateTicketStatusService", error);
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
      `INSERT INTO \`ticket_message\` (ticket_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)`,
      [messageData.ticket_id, messageData.sender_id, messageData.sender_type, messageData.message]
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