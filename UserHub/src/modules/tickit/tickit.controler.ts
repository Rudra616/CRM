import { Response, RequestHandler } from "express";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import {
  getTicketsByUserId,
  insertTicket,
  getAllTickets,
  updateTicketStatusService,
  updateTicketByOwner,
  insertTicketMessage,
  getTicketById,
  getTicketMessagesByTicketId,
} from "./tickit.service";
import { AuthRequest } from "../../common/types/AuthRequest";
import { Role } from "../../common/types/role";
import { buildImageUrl, deleteFileIfExists } from "../../common/helpers/common.helper";
import { buildStoredImagePath } from "../../config/uploads";
import { getPermissionByRoleAndModule } from "../../common/permission.service";
import { TicketStatus } from "./tickit.types";

export const createTicket: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, description } = req.body as { subject: string; description: string };
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const imageUrl = req.file
      ? buildStoredImagePath(req.user?.role ?? 0, userId, req.file.filename)
      : null;

    const ticketId = await insertTicket({
      user_id: userId,
      subject,
      description,
      status: "open",
      image_url: imageUrl,
    });

    return successResponse(res, "Ticket created successfully", { ticketId }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getUserTickets: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const tickets = await getTicketsByUserId(userId);
    const view = tickets.map((ticket) => ({
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(req, ticket.image_url) : null,
    }));

    return successResponse(res, "Tickets retrieved successfully", { tickets: view });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getAllTicketsByAdmin: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await getAllTickets();
    const view = tickets.map((ticket) => ({
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(req, ticket.image_url) : null,
    }));
    return successResponse(res, "Tickets retrieved successfully", { tickets: view });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

/** Plain user only: edit own ticket subject/description (and optional new image) while open/in_progress */
export const updateOwnedTicket: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "Unauthorized", 401);

    // Only end-user sessions (role 0) use this endpoint; admins use staff tools.
    if (req.user?.role !== 0) {
      return errorResponse(res, "Forbidden", 403);
    }

    const ticketId = Number(req.params.id);
    const { subject, description } = req.body as { subject: string; description: string };

    if (!ticketId || Number.isNaN(ticketId)) {
      return errorResponse(res, "Invalid ticket ID", 400);
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) return errorResponse(res, "Ticket not found", 404);
    if (ticket.user_id !== userId) return errorResponse(res, "Forbidden", 403);
    if (ticket.status === "resolved" || ticket.status === "closed") {
      return errorResponse(res, "Cannot edit a resolved or closed ticket", 400);
    }

    let imageUrl: string | null | undefined = undefined;
    if (req.file) {
      if (ticket.image_url) deleteFileIfExists(ticket.image_url);
      imageUrl = buildStoredImagePath(req.user?.role ?? 0, userId, req.file.filename);
    }

    const updated = await updateTicketByOwner(ticketId, userId, {
      subject,
      description,
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    });

    if (!updated) return errorResponse(res, "Ticket not found", 404);

    return successResponse(res, "Ticket updated successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const updateTicketStatus: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const { status } = req.body as { status: TicketStatus };

    if (!ticketId || Number.isNaN(ticketId)) {
      return errorResponse(res, "Invalid ticket ID", 400);
    }

    const updated = await updateTicketStatusService(ticketId, status);
    if (!updated) return errorResponse(res, "Ticket not found", 404);

    return successResponse(res, "Ticket status updated successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addTicketMessage: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { ticket_id, message } = req.body as { ticket_id: number; message: string };
    const senderId = req.user?.id;
    const userRole = req.user?.role;

    if (!senderId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const ticket = await getTicketById(Number(ticket_id));
    if (!ticket) {
      return errorResponse(res, "Ticket not found", 404);
    }

    const isOwner = ticket.user_id === senderId;
    const isStaff = userRole === Role.ADMIN || userRole === Role.SUBADMIN;

    if (userRole === Role.SUBADMIN) {
      const roleId = req.user?.role_id;
      if (!roleId) return errorResponse(res, "No role assigned", 403);
      const permission = await getPermissionByRoleAndModule(roleId, "ticket");
      if (!permission || permission.can_edit !== 1) {
        return errorResponse(res, "Permission denied for ticket messaging", 403);
      }
    }

    if (!isOwner && !isStaff) {
      return errorResponse(res, "Forbidden: You cannot access this ticket", 403);
    }

    await insertTicketMessage({
      ticket_id,
      sender_id: senderId,
      sender_type: isStaff ? "admin" : "user",
      message,
    });

    return successResponse(res, "Message added to ticket successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getTicketMessages: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) return errorResponse(res, "Unauthorized", 401);
    if (!ticketId || Number.isNaN(ticketId)) return errorResponse(res, "Invalid ticket ID", 400);

    const ticket = await getTicketById(ticketId);
    if (!ticket) return errorResponse(res, "Ticket not found", 404);

    const isOwner = ticket.user_id === requesterId;
    const isStaff = requesterRole === Role.ADMIN || requesterRole === Role.SUBADMIN;

    if (requesterRole === Role.SUBADMIN) {
      const roleId = req.user?.role_id;
      if (!roleId) return errorResponse(res, "No role assigned", 403);
      const permission = await getPermissionByRoleAndModule(roleId, "ticket");
      if (!permission || permission.can_view !== 1) {
        return errorResponse(res, "Permission denied for viewing ticket messages", 403);
      }
    }

    if (!isOwner && !isStaff) {
      return errorResponse(res, "Forbidden: You cannot access this ticket", 403);
    }

    const messages = await getTicketMessagesByTicketId(ticketId);
    const ticketView = {
      ...ticket,
      image_url: ticket.image_url ? buildImageUrl(req, ticket.image_url) : null,
    };

    return successResponse(res, "Ticket messages retrieved successfully", {
      ticket: ticketView,
      messages,
    });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};
