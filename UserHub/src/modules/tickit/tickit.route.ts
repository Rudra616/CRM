import { Router } from "express";
import {
  createTicket,
  getUserTickets,
  getAllTicketsByAdmin,
  updateOwnedTicket,
  updateTicketStatus,
  addTicketMessage,
  getTicketMessages,
} from "./tickit.controler";
import { authenticate, allowRoles } from "../../common/middleware/authMiddleware";
import { Role } from "../../common/types/role";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import {
  addTicketMessageSchema,
  createTicketSchema,
  updateOwnedTicketSchema,
  updateTicketStatusSchema,
} from "./tickit.validation";
import { checkPermission,skipUnlessStaff } from "../../common/middleware/permission.middleware";
import { RequestHandler } from "express";
import { AuthRequest } from "../../common/types/AuthRequest";

const router = Router();





router.post(
  "/create",
  authenticate,
  uploadSingle("image"),
  validateSchema(createTicketSchema),
  createTicket
);
router.get("/my-tickets", authenticate, getUserTickets);
router.get(
  "/all",
  authenticate,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("ticket", "can_view"),
  getAllTicketsByAdmin
);
router.get("/:id/messages", authenticate, getTicketMessages);
router.put(
  "/:id/status",
  authenticate,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateTicketStatusSchema),
  checkPermission("ticket", "can_edit"),
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
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(addTicketMessageSchema),
  checkPermission("ticket", "can_add"),
  addTicketMessage
);
router.post(
  "/message",
  authenticate,
  validateSchema(addTicketMessageSchema),
  addTicketMessage
);

export default router;