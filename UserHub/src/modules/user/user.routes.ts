import { Router } from "express";
import { validateSchema } from "../../common/middleware/joiValidationMiddleware";
import { uploadSingle } from "../../common/middleware/uploadImageMiddleware";
import { authenticate, requireUserSession } from "../../common/middleware/authMiddleware";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./user.validation";
import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword,
} from "./user.controller";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/register", validateSchema(registerSchema), registerUser);
router.post("/login", validateSchema(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", validateSchema(resetPasswordSchema), resetPassword);
router.post("/verify-reset-token", verifyResetToken);

// ─── Protected (any authenticated user session) ───────────────────────────────
router.get("/profile", authenticate, requireUserSession, getProfile);

router.put(
  "/profile",
  authenticate,
  requireUserSession,
  uploadSingle("image"),
  validateSchema(updateProfileSchema),
  updateProfile
);

router.post(
  "/change-password",
  authenticate,
  requireUserSession,
  validateSchema(changePasswordSchema),
  changePassword
);

export default router;
