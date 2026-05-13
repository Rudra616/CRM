import { Response, RequestHandler } from "express";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import {
  getTicketsByUserIdPaged,
  insertTicket,
  getAllTicketsPaged,
  updateTicketByOwner,
  insertTicketMessage,
  getTicketById,
  getTicketMessagesByTicketId,
  getOwnerTicketUnreadSummary,
  markAdminMessagesReadByOwner,
  markUserMessagesReadByStaff,
  getStaffTicketUnreadSummary,
  updateTicketStatusByOwner,
  updateTicketStatusByAdmin,
} from "./ticket.service";
import { findUserById } from "../user/user.service";
import { findAdminById } from "../admin/service/admin.service";
import { AuthRequest } from "../../common/types/AuthRequest";
import { buildImageUrl, deleteFileIfExists } from "../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../config/uploads";
import { getPermissionByRoleAndModule } from "../../common/permission.service";
import { TicketStatus } from "./ticket.types";
import { USERS_PAGE_SIZE_OPTIONS, normalizeListPageLimit } from "../admin/service/user.service";
import { emitSocket } from "../../realtime/socket";

/** Parses and validates query parameters for ticket listing endpoints. */
const parseTicketListQuery = (q: Record<string, unknown>) => {
  const pageRaw = Number(q.page ?? 1);
  const reqLimit = Number(q.limit ?? USERS_PAGE_SIZE_OPTIONS[0]);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = normalizeListPageLimit(reqLimit);
  const search = String(q.search ?? "");
  return { page, limit, search };
};




/**
 * crate ticket for logged in user with subject, description and optional image attachment.  
 *      
 * @param req subject, description in body and optional image file in multipart form data
 * @param res success message with created ticket ID response
 * @returns 
 */
export const createTicket: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    const { id: userId } = authReq.user;

    const { subject, description } = req.body as {
      subject: string;
      description: string;
    };

    const ownerRow = await findUserById(userId);
    if (!ownerRow) {
      return errorResponse(res, "User not found", 404);
    }

    const imageUrl = req.file
      ? buildStoredImagePath(authReq.user, userId, req.file.filename)
      : null;

    const ticketId = await insertTicket({
      user_id: userId,
      subject,
      description,
      status: "open",
      image_url: imageUrl,
    });

    await emitSocket({
      name: "ticket_updated",
      payload: {
        ticketId,
        ownerUserId: userId,
        status: "open",
        updatedBy: "user",
        updatedById: userId,
        kind: "created",
        ownerUsername: ownerRow.username,
        subject,
      },
    });

    return successResponse(res, "Ticket created successfully", { ticketId }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Get unread summary for the logged-in user's tickets.
 * 
 * @param req user must be authenticated; summary includes counts of unread messages for user's tickets
 * @param res counts of unread messages for user's tickets
 * @returns 
 */
export const getMyTicketUnreadSummaryHandler: RequestHandler = async (req,res) => {
    const authReq = req as AuthRequest;

  try {
    const userId = authReq.user.id;
    if (!userId) return errorResponse(res, "Unauthorized", 401);

    const summary = await getOwnerTicketUnreadSummary(userId);
    return successResponse(res, "Unread summary retrieved successfully", summary);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * get unread summary for all tickets for staff 
 * 
 * @param req authenticated staff user request; summary includes counts of unread messages for all tickets
 * @param res counts of unread messages for all tickets
 * @returns 
 */
export const getStaffTicketUnreadSummaryHandler: RequestHandler = async (req,res) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user.is_staff) return errorResponse(res, "Forbidden", 403);

    const summary = await getStaffTicketUnreadSummary();
    return successResponse(res, "Unread summary retrieved successfully", summary);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};


/**
 * get tickets for logged in user with pagination, search and filter support.
 * 
 * @param req user must be authenticated; includes pagination, search, and filter parameters
 * @param res paginated list of user's tickets matching search and filter criteria
 * @returns 
 */
export const getUserTickets: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user.id;
    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const { page, limit, search } = parseTicketListQuery(req.query as Record<string, unknown>);
    const result = await getTicketsByUserIdPaged(userId, { page, limit, search });
    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    const view = result.items.map((ticket) => ({
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(req, ticket.image_url) : null,
    }));

    return successResponse(res, "Tickets retrieved successfully", {
      items: view,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        limitOptions: [...USERS_PAGE_SIZE_OPTIONS],
      },
    });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * get all tickets for admin with pagination, search and filter support.
 * 
 * @param req admin user request; includes pagination, search, and filter parameters
 * @param res paginated list of all tickets matching search and filter criteria
 * @returns 
 */
export const getAllTicketsByAdmin: RequestHandler = async (req, res) => {
  try {
    const { page, limit, search } = parseTicketListQuery(req.query as Record<string, unknown>);
    const result = await getAllTicketsPaged({ page, limit, search });
    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    const view = result.items.map((ticket) => ({
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(req, ticket.image_url) : null,
    }));
    return successResponse(res, "Tickets retrieved successfully", {
      items: view,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        limitOptions: [...USERS_PAGE_SIZE_OPTIONS],
      },
    });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Update an owned ticket by the logged-in user.
 *
 * Allows a ticket owner to update subject, description, and optionally replace the ticket image.
 * Prevents updates on closed tickets and enforces ownership validation.
 *
 * @param req Authenticated request containing ticket ID in params and updated fields in body
 * @param res Returns success response if ticket is updated, otherwise error response
 */
export const updateOwnedTicket: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user.id;
    if (!userId) return errorResponse(res, "Unauthorized", 401);

    // if (authReq.user?.is_staff) {
    //   return errorResponse(res, "Forbidden", 403);
    // }

    const ticketId = Number(authReq.params.id);
    const { subject, description } = req.body as { subject: string; description: string };

    if (!ticketId || Number.isNaN(ticketId)) {
      return errorResponse(res, "Invalid ticket ID", 400);
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) return errorResponse(res, "Ticket not found", 404);
    if (ticket.user_id !== userId) return errorResponse(res, "Forbidden", 403);
    if (ticket.status === "closed") {
      return errorResponse(res, "Cannot edit a closed ticket", 400);
    }

    let imageUrl: string | null | undefined = undefined;
    if (req.file) {
      if (ticket.image_url) deleteFileIfExists(ticket.image_url);
      imageUrl = buildStoredImagePath(authReq.user!, userId, req.file.filename);
    }

    const updated = await updateTicketByOwner(ticketId, userId, {
      subject,
      description,
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    });

    if (!updated) return errorResponse(res, "Ticket not found", 404);
    await emitSocket({
      name: "ticket_updated",
      payload: {
        ticketId,
        ownerUserId: ticket.user_id,
        status: ticket.status,
        updatedBy: "user",
        updatedById: userId,
      },
    });

    return successResponse(res, "Ticket updated successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Update the status of a ticket.
 *
 * Allows ticket owner to update status with restrictions, while staff/admin can update any ticket.
 * Prevents unauthorized access and disallows updates on closed tickets for normal users.
 *
 * @param req Authenticated request containing ticket ID in params and new status in body
 * @param res Returns success response if status is updated, otherwise error response
 */
export const updateTicketStatus: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.id;
    const isStaff = Boolean(authReq.user?.is_staff);

    if (!userId) return errorResponse(res, "Unauthorized", 401);

    const ticketId = Number(authReq.params.id);
    const { status } = authReq.body as { status: TicketStatus };

    if (!ticketId || Number.isNaN(ticketId)) {
      return errorResponse(res, "Invalid ticket ID", 400);
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) return errorResponse(res, "Ticket not found", 404);

    let updated = false;

    // 👤 USER
    if (!isStaff) {
      if (ticket.user_id !== userId) {
        return errorResponse(res, "Forbidden", 403);
      }

      if (ticket.status === "closed") {
        return errorResponse(res, "Cannot change status of a closed ticket", 400);
      }

      updated = await updateTicketStatusByOwner(ticketId, userId, status);
    } 
    // 🛠 ADMIN
    else {
      updated = await updateTicketStatusByAdmin(ticketId, status);
    }

    if (!updated) {
      return errorResponse(res, "Ticket not found or not updated", 400);
    }
    await emitSocket({
      name: "status",
      event: {
        type: "ticket_status",
        ticketId,
        ownerUserId: ticket.user_id,
        status,
        updatedById: authReq.user?.id || 0,
      },
    });

    return successResponse(res, "Ticket status updated successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Add a message to a support ticket.
 *
 * Allows ticket owner or authorized staff to send messages with optional image attachments.
 * Handles permissions, ticket status checks, and marks messages as read accordingly.
 *
 * @param req Authenticated request containing ticket ID, message text, and optional file
 * @param res Returns success response if message is added, otherwise error response
 */
export const addTicketMessage: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const { ticket_id, message } = req.body as { ticket_id: number; message: string };
    const senderId = authReq.user?.id;
    if (!senderId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const text = String(message ?? "").trim();
    const file = req.file;
    if (!text && !file) {
      return errorResponse(res, "Message text or an image attachment is required", 400);
    }

    const ticket = await getTicketById(Number(ticket_id));
    if (!ticket) {
      return errorResponse(res, "Ticket not found", 404);
    }
    if (ticket.status === "closed") {
      return errorResponse(res, "Cannot send message on closed ticket", 400);
    }

    const isOwner = ticket.user_id === senderId;
    const isStaff = Boolean(authReq.user?.is_staff);

    if (isStaff && !authReq.user?.is_main_admin) {
      const roleId = authReq.user?.role_id;
      if (!roleId) return errorResponse(res, "No role assigned", 403);
      const permission = await getPermissionByRoleAndModule(roleId, "ticket");
      if (!permission || permission.can_add !== 1) {
        return errorResponse(res, "Permission denied for sending messages", 403);
      }
    }

    if (!isOwner && !isStaff) {
      return errorResponse(res, "Forbidden: You cannot access this ticket", 403);
    }
    const imagePath = file
      ? buildStoredImagePath(authReq.user!, senderId, file.filename)
      : null;
    const messageId = await insertTicketMessage({
      ticket_id,
      sender_id: senderId,
      sender_type: isStaff ? "admin" : "user",
      message: text,
      image: imagePath,
    });
    if (isOwner) {
      await markAdminMessagesReadByOwner(Number(ticket_id), senderId);
    }
    if (isStaff) {
      await markUserMessagesReadByStaff(Number(ticket_id));
    }

    let senderDisplayName: string | undefined;
    if (isStaff) {
      const adm = await findAdminById(senderId);
      const u = adm?.username?.trim();
      senderDisplayName = u || undefined;
    } else {
      const mem = await findUserById(senderId);
      const u = mem?.username?.trim();
      senderDisplayName = u || undefined;
    }
    const ticketSubjectRaw = String(ticket.subject ?? "").trim();
    const ticketSubject = ticketSubjectRaw || undefined;

    await emitSocket({
      name: "new_message",
      payload: {
        ticketId: Number(ticket_id),
        ownerUserId: ticket.user_id,
        senderId,
        senderType: isStaff ? "admin" : "user",
        ticketSubject,
        senderDisplayName,
        message: {
          id: messageId,
          ticket_id: Number(ticket_id),
          sender_id: senderId,
          sender_type: isStaff ? "admin" : "user",
          message: text,
          image: imagePath ? buildImageUrl(authReq, imagePath) : null,
          created_at: new Date().toISOString(),
          is_read_by_user: isStaff ? 0 : 1,
          is_read_by_admin: isStaff ? 1 : 0,
        },
      },
    });

    return successResponse(res, "Message added to ticket successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/**
 * Retrieve all messages for a specific ticket.
 *
 * Allows ticket owner and authorized staff to view full ticket conversation with messages and ticket details.
 * Enforces role-based access control and permission checks for staff users.
 *
 * @param req Authenticated request containing ticket ID in params
 * @param res Returns ticket details and message list, otherwise error response
 */
export const getTicketMessages: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const ticketId = Number(authReq.params.id);
    const requesterId = authReq.user?.id;

    if (!requesterId) return errorResponse(res, "Unauthorized", 401);
    if (!ticketId || Number.isNaN(ticketId)) return errorResponse(res, "Invalid ticket ID", 400);

    const ticket = await getTicketById(ticketId);
    if (!ticket) return errorResponse(res, "Ticket not found", 404);

    const isOwner = ticket.user_id === requesterId;
    const isStaff = Boolean(authReq.user?.is_staff);

    if (isStaff && !authReq.user?.is_main_admin) {
      const roleId = authReq.user?.role_id;
      if (!roleId) return errorResponse(res, "No role assigned", 403);
      const permission = await getPermissionByRoleAndModule(roleId, "ticket");
      if (!permission || permission.can_view !== 1) {
        return errorResponse(res, "Permission denied for viewing messages", 403);
      }
    }

    if (!isOwner && !isStaff) {
      return errorResponse(res, "Forbidden: You cannot access this ticket", 403);
    }

    const messages = (await getTicketMessagesByTicketId(ticketId)).map((msg: any) => ({
      ...msg,
      image: msg.image ? buildImageUrl(authReq, msg.image) : null,
    }));
    const ticketView = {
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(authReq, ticket.image_url) : null,
    };

    return successResponse(res, "Ticket messages retrieved successfully", {
      ticket: ticketView,
      messages,
    });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
