import { Router } from "express";
import { Role } from "../../common/types/role";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, allowRoles } from "../../common/middleware/authMiddleware";
import { enforceStatusPermission } from "../../common/middleware/statusPermissionMiddleware";

import { loginSchema, changePasswordSchema } from "../user/user.validation";
import {
  createSubadminSchema,
  updateSubadminSchema,
  adminUpdateUserStatusSchema,
  adminUpdateUserProfileSchema,
} from "../user/user.validation";
import { updateAdminSchema } from "./admin.validation";

// Admin self
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getDashboardSummary,
} from "./controller/admin.controller";

// Subadmin CRUD (managed by admin)
import {
  createSubadmin,
  getSubadmins,
  getSubadminById,
  updateSubadmin,
  deleteSubadmin,
  changeSubadminPasswordByAdmin,
} from "./controller/subadmin.controller";

// User management
import {
  getUsers,
  updateUserStatusByAdmin,
  updateUserProfileByAdminController,
  logoutUserByAdmin,
  deleteUserByAdmin,
} from "./controller/user.controller";

const router = Router();

// ════════════════════════════════════════════════════════
//  ADMIN — self-management
//  POST   /api/admin/login
//  POST   /api/admin/logout
//  GET    /api/admin/profile
//  PUT    /api/admin/profile
//  POST   /api/admin/change-password
//  GET    /api/admin/dashboard-summary
// ════════════════════════════════════════════════════════
router.post("/login",  validateSchema(loginSchema), adminLogin);
router.post("/logout", adminLogout);

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
  updateAdminProfile,
);
router.post(
  "/change-password",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeAdminPassword,
);
router.get(
  "/dashboard-summary",
  authenticate,
  allowRoles(Role.ADMIN),
  getDashboardSummary,
);

//  SUBADMINS — managed by admin
//  POST   /api/admin/subadmins
//  GET    /api/admin/subadmins
//  GET    /api/admin/subadmins/:id
//  PUT    /api/admin/subadmins/:id
//  POST   /api/admin/subadmins/:id/change-password
//  DELETE /api/admin/subadmins/:id
// ════════════════════════════════════════════════════════
router.post(
  "/subadmins",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(createSubadminSchema),
  createSubadmin,
);
router.get("/subadmins", authenticate, allowRoles(Role.ADMIN), getSubadmins);
router.get("/subadmins/:id", authenticate, allowRoles(Role.ADMIN), getSubadminById);
router.put(
  "/subadmins/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(updateSubadminSchema),
  updateSubadmin,
);
router.post(
  "/subadmins/:id/change-password",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeSubadminPasswordByAdmin,
);
router.delete("/subadmins/:id", authenticate, allowRoles(Role.ADMIN), deleteSubadmin);

// ════════════════════════════════════════════════════════
//  USERS — managed by admin (and subadmin can view)
//  GET    /api/admin/users
//  PATCH  /api/admin/users/:id          (status only)
//  PUT    /api/admin/users/:id          (full profile)
//  POST   /api/admin/users/:id/logout
//  DELETE /api/admin/users/:id
// ════════════════════════════════════════════════════════
router.get(
  "/users",
  authenticate,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  getUsers,
);
router.patch(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(adminUpdateUserStatusSchema),
  enforceStatusPermission,
  updateUserStatusByAdmin,
);
router.put(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(adminUpdateUserProfileSchema),
  updateUserProfileByAdminController,
);
router.post(
  "/users/:id/logout",
  authenticate,
  allowRoles(Role.ADMIN),
  logoutUserByAdmin,
);
router.delete(
  "/users/:id",
  authenticate,
  allowRoles(Role.ADMIN),
  deleteUserByAdmin,
);

export default router;
