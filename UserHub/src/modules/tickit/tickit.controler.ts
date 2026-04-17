import { Request,Response,RequestHandler } from "express";
import { successResponse, errorResponse } from "../../common/utils/apiResponse";
import { getTicketsByUserId, insertTicket,getAllTickets,updateTicketStatusService, insertTicketMessage,getTicketById } from "./tickit.service";
import { AuthRequest } from "../../common/types/AuthRequest";
import { Role } from "../../common/types/role";

export const createTicket: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, description } = req.body || {};
    const user_id = req.user?.id;

    if (!user_id) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (!subject || !description) {
      return errorResponse(res, "Subject and description are required", 400);
    }

    const ticketId = await insertTicket({
      user_id,
      subject,
      description,
      status: "open",
    });

    return successResponse(res, "Ticket created successfully", { ticketId }, 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const getUserTickets: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const tickets = await getTicketsByUserId(user_id);

    return successResponse(res, "Tickets retrieved successfully", { tickets });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
}

export const getAllTicketsByAdmin: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await getAllTickets();

    return successResponse(res, "Tickets retrieved successfully", { tickets });
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
}


export const updateTicketStatus: RequestHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticketId = Number(id);

    if (!ticketId || isNaN(ticketId)) {
      return errorResponse(res, "Invalid ticket ID", 400);
    }

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return errorResponse(res, "Invalid status value", 400);
    }

    await updateTicketStatusService(ticketId, status);

    return successResponse(res, "Ticket status updated successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

export const addTicketMessage: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { ticket_id, message } = req.body || {};
    const sender_id = req.user?.id;
    const user_role = req.user?.role;

    if (!sender_id) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const ticket = await getTicketById(Number(ticket_id));

    if (!ticket) {
      return errorResponse(res, "Ticket not found", 404);
    }

    // ❌ BLOCK: if not owner and not admin/subadmin
    const isOwner = ticket.user_id === sender_id;
    const isAdmin = user_role === Role.ADMIN || user_role === Role.SUBADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse(res, "Forbidden: You cannot access this ticket", 403);
    }

    await insertTicketMessage({
      ticket_id,
      sender_id,
      sender_type: isAdmin ? "admin" : "user",
      message,
    });

    return successResponse(res, "Message added to ticket successfully");
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
};

// export const addAdminMessage: RequestHandler = async (req: AuthRequest, res: Response) => {
//   try {
//     const { ticket_id, message } = req.body || {};
//     const sender_id = req.user?.id;
//     const sender_type = "admin";

//     if (!sender_id) {
//       return errorResponse(res, "Unauthorized", 401);
//     }

//     if (!ticket_id || !message) {
//       return errorResponse(res, "Ticket ID and message are required", 400);
//     }

//     // Insert the message into the database
//     await insertTicketMessage({ ticket_id, sender_id, sender_type, message });

//     return successResponse(res, "Message added to ticket successfully");
//   } catch (err: any) {
//     return errorResponse(res, err.message, 500);
//   }
// }
