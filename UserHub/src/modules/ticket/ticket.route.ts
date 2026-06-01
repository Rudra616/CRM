import { Router } from "express";
import {
  createTicket,
  getUserTickets,
  getMyTicketUnreadSummaryHandler,
  getStaffTicketUnreadSummaryHandler,
  getAllTicketsByAdmin,
  updateOwnedTicket,
  updateTicketStatus,
  addTicketMessage,
  getTicketMessages,
} from "./ticket.controller";
import { authenticate } from "../../common/middleware/authMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import {
  addTicketMessageSchema,
  createTicketSchema,
  updateOwnedTicketSchema,
  updateTicketStatusSchema,
} from "./ticket.validation";
import { checkPermission, skipUnlessStaff } from "../../common/middleware/permission.middleware";

const router = Router();





router.post(
  "/create",
  authenticate,
  uploadSingle("image"),
  validateSchema(createTicketSchema),
  createTicket
);
router.get("/my-tickets", authenticate, getUserTickets);
router.get("/my-unread-summary", authenticate, getMyTicketUnreadSummaryHandler);
/** Staff unread badge — requires ticket can_add (same as sending messages); subadmins without Add get no request from client. */
router.get(
  "/staff-unread-summary",
  authenticate,
  checkPermission("ticket", "can_add"),
  getStaffTicketUnreadSummaryHandler
);
router.get(
  "/",
  authenticate,
  checkPermission("ticket", "can_view"),
  getAllTicketsByAdmin
);
router.get("/:id/messages", authenticate, getTicketMessages);
router.put(
  "/:id/status",
  authenticate,
  validateSchema(updateTicketStatusSchema),
  skipUnlessStaff,
  checkPermission("ticket", "can_edit"),
  updateTicketStatus
);
router.put(
  "/:id/status",
  authenticate,
  validateSchema(updateTicketStatusSchema),
  updateTicketStatus
);
router.put(
  "/:id",
  authenticate,
  uploadSingle("image"),
  validateSchema(updateOwnedTicketSchema),
  updateOwnedTicket
);
router.post(
  "/message",
  authenticate,
  skipUnlessStaff,
  uploadSingle("image"),
  validateSchema(addTicketMessageSchema),
  checkPermission("ticket", "can_add"),
  addTicketMessage
);
/** Same path as above: `skipUnlessStaff` uses `next('route')` for members so they must hit this chain (no ticket `can_add` RBAC). */
router.post(
  "/message",
  authenticate,
  uploadSingle("image"),
  validateSchema(addTicketMessageSchema),
  addTicketMessage
);

export default router;