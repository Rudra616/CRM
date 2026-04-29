import { Router } from "express";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { authenticate } from "../../common/middleware/authMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import {
  loginSchema,
  changePasswordSchema,
} from "../user/user.validation";
import { updateAdminSchema } from "../admin/admin.validation";
import {
  subadminLogin,
  subadminLogout,
  getSubadminProfile,
  updateSubadminProfile,
  changeSubadminPassword,
} from "../admin/controller/subadmin.self.controller";
const router = Router();

// Subadmin self
router.post("/login", validateSchema(loginSchema), subadminLogin);
router.post("/logout", subadminLogout);
router.get("/profile", authenticate, 
  // allowRoles(Role.SUBADMIN), 
  getSubadminProfile);
router.put(
  "/profile",
  authenticate,
  // allowRoles(Role.SUBADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateSubadminProfile,
);
router.post(
  "/change-password",
  authenticate,
      // allowRoles(Role.SUBADMIN),
  validateSchema(changePasswordSchema),
  changeSubadminPassword,
);
export default router;

