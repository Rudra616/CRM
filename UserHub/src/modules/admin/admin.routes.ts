import { Router } from "express";
import { Role } from "../../common/types/role";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, allowRoles } from "../../common/middleware/authMiddleware";
import { loginSchema, changePasswordSchema } from "../user/user.validation";
import {
  createSubadminSchema,
  updateSubadminSchema,
  adminUpdateUserStatusSchema,
  adminUpdateUserProfileSchema,
} from "../user/user.validation";
import {
  createModuleSchema,
  createRoleSchema,
  updateAdminSchema,
  updateRolePermissionsSchema,
} from "./admin.validation";
import {
  addModule,
  addRole,
  getPermissionsByRole,
  listModules,
  listRoles,
  savePermissionsByRole,
} from "./controller/rbac.controller";

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
  updateUserStatus,
  updateUserProfileByAdminController,
  logoutUserByAdmin,
  deleteUserByAdmin,
} from "./controller/user.controller";

const router = Router();


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
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  getDashboardSummary,
);

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

// RBAC: modules, roles, role permissions
router.get("/modules", authenticate, allowRoles(Role.ADMIN), listModules);
router.post(
  "/modules",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(createModuleSchema),
  addModule
);
router.get("/roles", authenticate, allowRoles(Role.ADMIN), listRoles);
router.post(
  "/roles",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(createRoleSchema),
  addRole
);
router.get(
  "/roles/:roleId/permissions",
  authenticate,
  allowRoles(Role.ADMIN),
  getPermissionsByRole
);
router.put(
  "/roles/:roleId/permissions",
  authenticate,
  allowRoles(Role.ADMIN),
  validateSchema(updateRolePermissionsSchema),
  savePermissionsByRole
);
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
  updateUserStatus
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
