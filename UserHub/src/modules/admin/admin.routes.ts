import { Router } from "express";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, requireStaffSession } from "../../common/middleware/authMiddleware";
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
  createSubadmin,
  getSubadmins,
  getSubadminById,
  updateSubadmin,
  deleteSubadmin,
  changeSubadminPasswordByAdmin,
} from "./controller/admin.controller";
import {
  checkPermission,
} from "../../common/middleware/permission.middleware";
// Subadmin CRUD (managed by admin)
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
  requireStaffSession,
  // allowRoles(Role.ADMIN),
  getAdminProfile
);
router.put(
  "/profile",
  authenticate,
  requireStaffSession,
    // allowRoles(Role.ADMIN),
  uploadSingle("image"),
  validateSchema(updateAdminSchema),
  updateAdminProfile,
);
router.post(
  "/change-password",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN),
  validateSchema(changePasswordSchema),
  changeAdminPassword,
);
router.get(
  "/dashboard-summary",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_view"),
  getDashboardSummary,
);

router.post(
  "/subadmins",
  authenticate,
  requireStaffSession,
  validateSchema(createSubadminSchema),
  checkPermission("subadmin", "can_add"),
  createSubadmin,
);
router.get(
  "/subadmins",
  authenticate,
  requireStaffSession,
  checkPermission("subadmin", "can_view"),
  getSubadmins
);
router.get(
  "/subadmins/:id",
  authenticate,
  requireStaffSession,
  checkPermission("subadmin", "can_view"),
  getSubadminById
);
router.put(
  "/subadmins/:id",
  authenticate,
  requireStaffSession,
  validateSchema(updateSubadminSchema),
  checkPermission("subadmin", "can_edit"),
  updateSubadmin,
);
router.post(
  "/subadmins/:id/change-password",
  authenticate,
  requireStaffSession,
  validateSchema(changePasswordSchema),
  checkPermission("subadmin", "can_edit"),
  changeSubadminPasswordByAdmin,
);
router.delete(
  "/subadmins/:id",
  authenticate,
  requireStaffSession,
  checkPermission("subadmin", "can_delete"),
  deleteSubadmin
);

// RBAC: modules, roles, role permissions (admin + subadmin with per-module permissions)
router.get(
  "/modules/table",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listModulesTable
);
router.patch(
  "/modules/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateModuleRowSchema),
  checkPermission("module", "can_edit"),
  updateModuleRow
);
router.delete(
  "/modules/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_delete"),
  deleteModuleRow
);
router.get(
  "/modules",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listModules
);
router.post(
  "/modules",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(createModuleSchema),
  checkPermission("module", "can_add"),
  addModule
);

router.get(
  "/roles/table",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listRolesTable
);
router.patch(
  "/roles/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateRoleRowSchema),
  checkPermission("module", "can_edit"),
  updateRoleRow
);
router.delete(
  "/roles/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_delete"),
  deleteRoleRow
);
router.get(
  "/roles",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  listRoles
);
router.post(
  "/roles",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(createRoleSchema),
  checkPermission("module", "can_add"),
  addRole
);
router.get(
  "/roles/:roleId/permissions",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("module", "can_view"),
  getPermissionsByRole
);
router.put(
  "/roles/:roleId/permissions",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(updateRolePermissionsSchema),
  checkPermission("module", "can_edit"),
  savePermissionsByRole
);

router.get(
  "/users",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_view"),

  getUsers,
);
router.patch(
  "/user/status/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(adminUpdateUserStatusSchema),
  checkPermission("user", "can_edit"),

  updateUserStatus
);
router.put(
  "/user/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  validateSchema(adminUpdateUserProfileSchema),
  updateUserProfileByAdminController,
);
router.post(
  "/user/:id/logout",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  logoutUserByAdmin,
);
router.delete(
  "/user/:id",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  checkPermission("user", "can_delete"),

  deleteUserByAdmin,
);
router.get(
  "/me/permissions",
  authenticate,
  requireStaffSession,
  // allowRoles(Role.ADMIN, Role.SUBADMIN),
  getMyPermissions,
);
 
export default router;


