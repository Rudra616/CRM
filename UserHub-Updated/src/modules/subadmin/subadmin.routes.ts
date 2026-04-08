import { Router } from "express";
import { Role } from "../../common/types/role";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { authenticate, allowRoles } from "../../common/middleware/authMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { enforceStatusPermission } from "../../common/middleware/statusPermissionMiddleware";
import {
  loginSchema,
  changePasswordSchema,
  adminUpdateUserStatusSchema,
} from "../user/user.validation";
import { updateAdminSchema } from "../admin/admin.validation";
import {
  subadminLogin,
  subadminLogout,
  getSubadminProfile,
  updateSubadminProfile,
  changeSubadminPassword,
} from "../admin/controller/subadmin.self.controller";
import {
  getUsers,
  updateUserStatusBySubadmin,
} from "../admin/controller/user.controller";

const router = Router();

// Subadmin self
router.post("/login", validateSchema(loginSchema), subadminLogin);
router.post("/logout", subadminLogout);
router.get("/profile", authenticate, allowRoles(Role.SUBADMIN), getSubadminProfile);
router.put(
  "/profile",
  authenticate,
  allowRoles(Role.SUBADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateSubadminProfile,
);
router.post(
  "/change-password",
  authenticate,
  allowRoles(Role.SUBADMIN),
  validateSchema(changePasswordSchema),
  changeSubadminPassword,
);

// Subadmin user-management (limited)
router.get("/users", authenticate, allowRoles(Role.SUBADMIN), getUsers);
router.patch(
  "/users/:id/status",
  authenticate,
  allowRoles(Role.SUBADMIN),
  validateSchema(adminUpdateUserStatusSchema),
  enforceStatusPermission,
  updateUserStatusBySubadmin,
);

export default router;

