import db from "../../config/db";
import { logServiceError } from "../../common/helpers/serviceError";
import type { BroadcastRow, CreateBroadcastInput,BroadcastResponse } from "./broadcast.types";
import { softDelete } from "../../common/helpers/service.helper";


/**
 * Inserts a new broadcast message into the database after validation.
 *
 * @param data Broadcast input data containing message
 * @returns Created broadcast response with ID, message, and timestamp
 */
export const insertBroadcast = async (
  data: CreateBroadcastInput
): Promise<BroadcastResponse> => {
  try {
    const message = String(data.message ?? "").trim();

    if (!message) {
      throw new Error("Message is required");
    }

    const created_at = new Date().toISOString();

    const [result]: any = await db.query(
      `INSERT INTO \`broadcast\`
      (\`message\`, \`is_delete\`)
      VALUES (?, 0)`,
      [message]
    );

    return {
      id: Number(result.insertId),
      message,
      created_at,
    };
  } catch (error: unknown) {
    logServiceError("broadcast.service", "insertBroadcast", error);
    throw error;
  }
};

/**
 * Fetches a broadcast by its ID if it is not deleted.
 *
 * @param id Broadcast ID
 * @returns Broadcast record or null if not found
 */
export const getBroadcastById = async (id: number): Promise<BroadcastRow | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, message, is_delete, created_at FROM \`broadcast\` WHERE id = ? AND is_delete = 0`,
      [id]
    );
    return rows?.[0] ?? null;
  } catch (error: unknown) {
    logServiceError("broadcast.service", "getBroadcastById", error);
    throw error;
  }
};

/**
 * Fetches the latest active broadcast message.
 *
 * @returns Latest broadcast record or null if none exists
 */
export const getLatestBroadcast = async (): Promise<BroadcastRow | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, message, created_at
       FROM \`broadcast\`
       WHERE is_delete = 0
       ORDER BY COALESCE(created_at, '1970-01-01') DESC, id DESC
       LIMIT 1`
    );
    return rows?.[0] ?? null;
  } catch (error: unknown) {
    logServiceError("broadcast.service", "getLatestBroadcast", error);
    throw error;
  }
};

/**
 * Fetches the N most recent broadcast rows, ordered oldest → newest (newest last in the array).
 */
export const listBroadcasts = async (limit = 50): Promise<BroadcastRow[]> => {
  try {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const [rows]: any = await db.query(
      `SELECT id, message, created_at
       FROM \`broadcast\`
       WHERE is_delete = 0
       ORDER BY COALESCE(created_at, '1970-01-01') DESC, id DESC
       LIMIT ?`,
      [lim]
    );
    const list: BroadcastRow[] = rows ?? [];
    return list.slice().reverse();
  } catch (error: unknown) {
    logServiceError("broadcast.service", "listBroadcasts", error);
    throw error;
  }
};


/**
  * Soft deletes a broadcast message by ID.
 * 
 * @param id msg ID to delete
 * @returns 
 */
export const softDeleteBroadcast = async (
  id: number
): Promise<boolean> => {
  try {
  return await softDelete("broadcast", id);
  }catch (error: unknown) {
    logServiceError("broadcast.service", "softDeleteBroadcast", error);
    throw error;
  }
};