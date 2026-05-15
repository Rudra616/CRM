import { Router } from "express";
import {
  authenticate,
  requireUserSession,
} from "../../common/middleware/authMiddleware";
import {
  getLatestBroadcastPublic,
  getMemberBroadcastList,
} from "./broadcast.controller";

const router = Router();

router.get("/latest", authenticate, requireUserSession, getLatestBroadcastPublic);
router.get("/list", authenticate, requireUserSession, getMemberBroadcastList);

export default router;
