import { RequestHandler } from "express";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import {
  insertBroadcast,
  getBroadcastById,
  getLatestBroadcast,
  listBroadcasts,
  softDeleteBroadcast,
} from "./broadcast.service";

/**
 * Creates a new broadcast message and emits it via socket to all connected clients.
 *
 * @param req Request object containing broadcast message in body
 * @param res Response object
 * @returns Created broadcast data
 */
export const createBroadcast: RequestHandler = async (req, res) => {
  try {
    const { message } = req.body as { message: string };

    const broadcast = await insertBroadcast({ message });


    return successResponse(
      res,
      "Broadcast sent",
      broadcast,
      201
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to create broadcast";

    return errorResponse(res, msg, 500);
  }
};

/**
 * Soft deletes a broadcast message by ID.
 *
 * @param req Request object containing broadcast ID in params
 * @param res Response object
 * @returns Success response if broadcast is deleted
 */
export const deleteBroadcast: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return errorResponse(res, "Invalid broadcast id", 400);
    }
    const ok = await softDeleteBroadcast(id);
    if (!ok) {
      return errorResponse(res, "Broadcast not found or already deleted", 404);
    }

    return successResponse(res, "Broadcast deleted", null, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete broadcast";
    return errorResponse(res, msg, 500);
  }
};

/**
 * Fetches the latest broadcast message for public access.
 *
 * @param req Request object
 * @param res Response object
 * @returns Latest broadcast message
 */
/** Latest active broadcast for a logged-in member (`requireUserSession`). */
export const getLatestBroadcastPublic: RequestHandler = async (_req, res) => {
  try {
    const row = await getLatestBroadcast();
    return successResponse(res, "Latest broadcast", row, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch broadcast";
    return errorResponse(res, msg, 500);
  }
};

/** Active broadcasts for members (`requireUserSession`). */
export const getMemberBroadcastList: RequestHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 100);
    const items = await listBroadcasts(limit);
    return successResponse(res, "Broadcasts", { items }, 200);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list broadcasts";
    return errorResponse(res, msg, 500);
  }
};
