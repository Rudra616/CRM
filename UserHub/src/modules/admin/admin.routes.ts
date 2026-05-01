import { Router } from "express";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate } from "../../common/middleware/authMiddleware";
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
  updateModuleRowSchema,
  updateRolePermissionsSchema,
  updateRoleRowSchema,
} from "./admin.validation";
import {
  addModule,
  addRole,
  deleteModuleRow,
  deleteRoleRow,
  getPermissionsByRole,
  getMyPermissions,
  listModules,
  listModulesTable,
  listRoles,
  listRolesTable,
  savePermissionsByRole,
  updateModuleRow,
  updateRoleRow,
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
import {
  checkPermission,
} from "../../common/middleware/permission.middleware";
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
  // allowRoles(Role.ADMIN),
  getAdminProfile
);
router.put(
  "/profile",
  authenticate,
    // allowRoles(Role.ADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateAdminProfile,
);
router.post(
  "/change-password",
  authenticate,
  // allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeAdminPassword,
);
router.get(
  "/dashboard-summary",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_view"),
  getDashboardSummary,
);

router.post(
  "/subadmins",
  authenticate,
  validateSchema(createSubadminSchema),
  checkPermission("subadmin", "can_add"),
  createSubadmin,
);
router.get(
  "/subadmins",
  authenticate,
  checkPermission("subadmin", "can_view"),
  getSubadmins
);
router.get(
  "/subadmins/:id",
  authenticate,
  checkPermission("subadmin", "can_view"),
  getSubadminById
);
router.put(
  "/subadmins/:id",
  authenticate,
  validateSchema(updateSubadminSchema),
  checkPermission("subadmin", "can_edit"),
  updateSubadmin,
);
router.post(
  "/subadmins/:id/change-password",
  authenticate,
  validateSchema(changePasswordSchema),
  checkPermission("subadmin", "can_edit"),
  changeSubadminPasswordByAdmin,
);
router.delete(
  "/subadmins/:id",
  authenticate,
  checkPermission("subadmin", "can_delete"),
  deleteSubadmin
);

// RBAC: modules, roles, role permissions (admin + subadmin with per-module permissions)
router.get(
  "/modules/table",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listModulesTable
);
router.patch(
  "/modules/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateModuleRowSchema),
  checkPermission("module", "can_edit"),
  updateModuleRow
);
router.delete(
  "/modules/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_delete"),
  deleteModuleRow
);
router.get(
  "/modules",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listModules
);
router.post(
  "/modules",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(createModuleSchema),
  checkPermission("module", "can_add"),
  addModule
);

router.get(
  "/roles/table",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listRolesTable
);
router.patch(
  "/roles/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateRoleRowSchema),
  checkPermission("module", "can_edit"),
  updateRoleRow
);
router.delete(
  "/roles/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_delete"),
  deleteRoleRow
);
router.get(
  "/roles",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listRoles
);
router.post(
  "/roles",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(createRoleSchema),
  checkPermission("module", "can_add"),
  addRole
);
router.get(
  "/roles/:roleId/permissions",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  getPermissionsByRole
);
router.put(
  "/roles/:roleId/permissions",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateRolePermissionsSchema),
  checkPermission("module", "can_edit"),
  savePermissionsByRole
);
router.get(
  "/users",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_view"),

  getUsers,
);
router.patch(
  "/users/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(adminUpdateUserStatusSchema),
  checkPermission("user", "can_edit"),

  updateUserStatus
);
router.put(
  "/users/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(adminUpdateUserProfileSchema),
  updateUserProfileByAdminController,
);
router.post(
  "/users/:id/logout",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  logoutUserByAdmin,
);
router.delete(
  "/users/:id",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_delete"),

  deleteUserByAdmin,
);
router.get(
  "/me/permissions",
  authenticate,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  getMyPermissions,
);
 
export default router;


