import db from "../../config/db";
import { Ticket,TicketMessage } from "../../common/types/user";
import { logServiceError } from "../../common/helpers/serviceError";
import { RowDataPacket } from "mysql2";

export const insertTicket = async (ticketData: Omit<Ticket, "id" | "created_at" | "updated_at">): Promise<number> => {
  try {
    const [result]: any = await db.query(
      `INSERT INTO \`ticket\` (user_id, subject, description, status) VALUES (?, ?, ?, ?)`,
      [ticketData.user_id, ticketData.subject, ticketData.description, ticketData.status]
    );
    return result.insertId;
  } catch (error: unknown) {
    logServiceError("tickit.service", "insertTicket", error);
    throw error;
  }
};

export const getTicketsByUserId = async (userId: number): Promise<Ticket[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, created_at, updated_at FROM \`ticket\` WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("tickit.service", "getTicketsByUserId", error);
    throw error;
  }
}

export const getAllTickets = async (): Promise<TicketMessage[]> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id, subject, description, status, created_at, updated_at FROM \`ticket\` ORDER BY created_at DESC`
    );
    return rows;
  } catch (error: unknown) {
    logServiceError("tickit.service", "getAllTickets", error);
    throw error;
  }
}

export const updateTicketStatusService = async (ticketId: number, status: "open" | "in_progress" | "resolved" | "closed"): Promise<void> => {
  try {
     await db.query(
      "UPDATE `ticket` SET status = ? WHERE id = ?",
      [status, ticketId]
    );
  } catch (error: unknown) {
    logServiceError("tickit.service", "updateTicketStatusService", error);
    throw error;
  }
}


export const insertTicketMessage = async (messageData: Omit<TicketMessage, "id" | "created_at">): Promise<number> => {
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

export const getTicketById = async (ticketId: number) => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, user_id FROM \`ticket\` WHERE id = ?`,
      [ticketId]
    );
    return rows[0];
  } catch (error) {
    logServiceError("tickit.service", "getTicketById", error);
    throw error;
  }
};