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
import { authenticate } from "../../common/middleware/authMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import {
  addTicketMessageSchema,
  createTicketSchema,
  updateOwnedTicketSchema,
  updateTicketStatusSchema,
} from "./tickit.validation";
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
router.get(
  "/all",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
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
/** `skipUnlessStaff` must run before `uploadSingle`. Otherwise staff’s route consumes the multipart
 *  body with multer, then `next("route")` replays the request and the second multer sees an empty
 *  stream → "Unexpected end of form" for regular users. */
router.post(
  "/message",
  authenticate,
  skipUnlessStaff,
  uploadSingle("image"),
  validateSchema(addTicketMessageSchema),
  checkPermission("ticket", "can_add"),
  addTicketMessage
);
router.post(
  "/message",
  authenticate,
  uploadSingle("image"),
  validateSchema(addTicketMessageSchema),
  addTicketMessage
);

export default router;