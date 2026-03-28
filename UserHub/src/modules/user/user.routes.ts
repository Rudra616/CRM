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
} from "./user.validation";
import {
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  getProfile,
  updateProfile,
  getUsers,
  forgotPassword,
  resetPassword,
  verifyResetToken
} from "./user.controller";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/register",        validateSchema(registerSchema), registerUser);
router.post("/login",           validateSchema(loginSchema),    loginUser);
router.post("/logout",          logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", validateSchema(resetPasswordSchema), resetPassword);
router.post("/verify-reset-token", verifyResetToken);

router.get("/session", authenticate, getSession);

// ─── Protected (user / subadmin) ──────────────────────────────────────────────
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

export default router;