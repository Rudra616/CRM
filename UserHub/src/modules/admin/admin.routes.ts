import { Router } from "express";
import { Role } from "../../common/types/role";
// import { authenticate, allowRoles } from "../../middleware/authMiddleware";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate,allowRoles } from "../../common/middleware/authMiddleware";

import {
  loginSchema,
  subadminSchema,
  updateSubadminProfileSchema,
  changePasswordSchema,
  adminUpdateUserStatusSchema,
  adminUpdateUserProfileSchema,
} from "../user/user.validation";
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
  changeAdminPassword,
  getUsers,
  updateUser,
  logoutUserByAdmin,
  deleteUserByAdmin,
  updateUserProfileByAdminController,
  getDashboardSummary,
  changeSubadminPasswordByAdmin,
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
  "/change-password",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeAdminPassword
);
router.get(
  "/dashboard-summary",
  authenticate,
  allowRoles(Role.ADMIN),
  getDashboardSummary
);
router.get(
  "/users",
  authenticate,
  allowRoles(Role.ADMIN),
  getUsers
);

// ✅ Update user role or status
router.patch(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(adminUpdateUserStatusSchema),
  updateUser
);

router.put(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(adminUpdateUserProfileSchema),
  updateUserProfileByAdminController
);

router.post(
  "/users/:id/logout",
  authenticate,
  allowRoles(Role.ADMIN),
  logoutUserByAdmin
);

router.delete(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  deleteUserByAdmin
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
  validateSchema(updateSubadminProfileSchema),
  updateSubadmin
);

router.post(
  "/subadmins/:id/change-password",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeSubadminPasswordByAdmin
);

router.delete(
  "/subadmins/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  deleteSubadmin
);

export default router;