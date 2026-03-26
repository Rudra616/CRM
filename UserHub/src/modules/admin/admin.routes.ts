import { Router } from "express";
import { Role } from "../../common/types/role";
// import { authenticate, allowRoles } from "../../middleware/authMiddleware";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate,allowRoles } from "../../common/middleware/authMiddleware";

import { loginSchema, subadminSchema, updateUserSchema } from "../user/user.validation";
import { updateAdminSchema } from "./admin.validation";
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  createSubadmin,
  getSubadmins,
  updateSubadmin,
  deleteSubadmin,
} from "./admin.controller";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/login",  validateSchema(loginSchema), adminLogin);
router.post("/logout", adminLogout);

// ─── Protected (admin only) ───────────────────────────────────────────────────
router.get(
  "/profile",
  authenticate,
  allowRoles(Role.ADMIN),
  getAdminProfile
);

router.put(
  "/profile",
  authenticate,
  allowRoles(Role.ADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateAdminProfile
);

router.post(
  "/subadmins",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(subadminSchema),
  createSubadmin
);

router.get(
  "/subadmins",
  authenticate,
  allowRoles(Role.ADMIN),
  getSubadmins
);

router.put(
  "/subadmins/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(updateUserSchema),
  updateSubadmin
);

router.delete(
  "/subadmins/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  deleteSubadmin
);

export default router;