import { Router } from "express";
import { createTicket, getUserTickets,getAllTicketsByAdmin,updateTicketStatus, addTicketMessage } from "./tickit.controler";
import { authenticate,allowRoles } from "../../common/middleware/authMiddleware";
import { Role } from "../../common/types/role";

const router = Router();

router.post("/create", authenticate, createTicket);
router.get("/my-tickets", authenticate, getUserTickets);
router.get("/all", authenticate, allowRoles(Role.ADMIN), getAllTicketsByAdmin);
router.put("/:id/status", authenticate, allowRoles(Role.ADMIN), updateTicketStatus);
// router.post("/message", authenticate, addAdminTicketMessage);
router.post("/user/message", authenticate, addTicketMessage);

export default router;