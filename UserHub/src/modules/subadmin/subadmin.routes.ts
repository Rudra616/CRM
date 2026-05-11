import { Router } from "express";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { authenticate, requireStaffSession } from "../../common/middleware/authMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import {
  loginSchema,
  changePasswordSchema,
} from "../user/user.validation";
import { updateAdminSchema } from "../admin/admin.validation";
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from "../admin/controller/admin.controller";
const router = Router();

// Subadmin self
router.post("/login", validateSchema(loginSchema), adminLogin);
router.post("/logout", adminLogout);
router.get("/profile", authenticate, 
  requireStaffSession,
  // allowRoles(Role.SUBADMIN), 
  getAdminProfile);
router.put(
  "/profile",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.SUBADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateAdminProfile,
);
router.post(
  "/change-password",
  authenticate,
  requireStaffSession,
      // allowRoles(Role.SUBADMIN),
  validateSchema(changePasswordSchema),
  changeAdminPassword,
);
export default router;

