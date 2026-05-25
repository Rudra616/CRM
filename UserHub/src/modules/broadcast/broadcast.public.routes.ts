import { Router } from "express";
import {
  authenticate,
  requireUserSession,
} from "../../common/middleware/authMiddleware";
import {
  getMemberBroadcastList,
} from "./broadcast.controller";

const router = Router();

router.get("/list", authenticate, requireUserSession, getMemberBroadcastList);

export default router;
