import { Router } from "express";
import { Role } from "../../common/types/role";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, allowRoles } from "../../common/middleware/authMiddleware";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  resetPasswordSchema,
  changePasswordSchema
} from "./user.validation";
import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  getUsers,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword,
  pingSession,
} from "./user.controller";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/register",        validateSchema(registerSchema), registerUser);
router.post("/login",           validateSchema(loginSchema),    loginUser);
router.post("/logout",          logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", validateSchema(resetPasswordSchema), resetPassword);
router.post("/verify-reset-token", verifyResetToken);

// ─── Protected (user / subadmin) ──────────────────────────────────────────────
router.get(
  "/session/ping",
  authenticate,
  allowRoles(Role.USER, Role.SUBADMIN),
  pingSession
);

router.get(
  "/profile",
  authenticate,
  allowRoles(Role.USER, Role.SUBADMIN),
  getProfile
);

router.put(
  "/profile",
  authenticate,
  allowRoles(Role.USER, Role.SUBADMIN),
  uploadSingle("image"),
  validateSchema(updateProfileSchema),
  updateProfile
);

// ─── Protected (admin / subadmin) ─────────────────────────────────────────────
router.get(
  "/users",
  authenticate,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  getUsers
);

router.post(
  "/change-password",
  authenticate,
  allowRoles(Role.USER, Role.SUBADMIN),
  validateSchema(changePasswordSchema),
  changePassword
);

export default router;