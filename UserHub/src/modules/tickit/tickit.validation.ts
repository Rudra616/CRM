import Joi from "joi";

const TICKET_STATUS = ["open", "in_progress", "resolved", "closed"] as const;

const trimmedString = () => Joi.string().trim();
const positiveInt = () => Joi.number().integer().positive();

const ticketSubjectField = trimmedString().min(5).max(150).required().messages({
  "string.empty": "Subject is required",
  "string.min": "Subject must be at least 5 characters",
  "string.max": "Subject must be at most 150 characters",
});

const ticketDescriptionField = trimmedString().min(10).max(2000).required().messages({
  "string.empty": "Description is required",
  "string.min": "Description must be at least 10 characters",
  "string.max": "Description must be at most 2000 characters",
});

export const createTicketSchema = Joi.object({
  subject: ticketSubjectField,
  description: ticketDescriptionField,
});

/** Owner-only update (same rules as create). */
export const updateOwnedTicketSchema = Joi.object({
  subject: ticketSubjectField,
  description: ticketDescriptionField,
});

export const updateTicketStatusSchema = Joi.object({
  status: trimmedString().valid(...TICKET_STATUS).required().messages({
    "string.empty": "Status is required",
    "any.only": "Status must be one of: open, in_progress, resolved, closed",
  }),
});

/** Same image rules as ticket create (handled by multer); body allows text-only, image-only, or both. */
export const addTicketMessageSchema = Joi.object({
  ticket_id: positiveInt().required().messages({
    "any.required": "Ticket ID is required",
    "number.base": "Ticket ID must be a positive number",
  }),
  message: trimmedString().max(2000).allow("").optional().default("").messages({
    "string.max": "Message must be at most 2000 characters",
  }),
});

