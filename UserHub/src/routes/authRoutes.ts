import express from "express";

import {
  login,
  logout,
  registerUser,
  createSubadmin,
  getUsers,
  getSubadmins,
  getProfile,
  updateProfile,
  updateSubadmin,
  deleteSubadmin,
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  sendResetPasswordEmail,
  resetPassword
} from "../controllers/authController";
import { Role } from "../types/role";
import { verifyToken, allowRoles } from "../middleware/authMiddleware";
import { uploadImage } from "../middleware/uploadImageMiddleware";
import { validateSchema } from "../middleware/joiValidationMiddleware";

import {
  registerSchema,
  loginSchema,
  subadminSchema,
  updateUserSchema,
  updateProfileSchema,
  updateAdminSchema
} from "../validations/authSchemas";

const router = express.Router();

router.get("/health", (_, res) => res.status(200).json({ ok: true }));

router.post(
  "/register",
  validateSchema(registerSchema),
  registerUser
);

router.post(
  "/login",
  validateSchema(loginSchema),
  login
); 
router.post("/admin/login", validateSchema(loginSchema), adminLogin);
router.post("/logout", logout);
router.post("/admin/logout", logout);
router.get(
  "/profile",
  verifyToken,
  allowRoles(Role.USER, Role.SUBADMIN),
  getProfile
);// router.get("/me", verifyToken, getProfile);
router.put("/profile", verifyToken, (req, res, next) => {
  uploadImage.single("image")(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
}, validateSchema(updateProfileSchema), updateProfile);

// ADMIN PROFILE
router.get(
  "/admin/profile",
  verifyToken,
  allowRoles(Role.ADMIN),
  getAdminProfile
);


router.put(
  "/admin/profile",
  verifyToken,
  allowRoles(Role.ADMIN),
  (req, res, next) => {
    uploadImage.single("image")(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  validateSchema(updateAdminSchema),
  updateAdminProfile
);
router.post(
  "/admin/create-subadmin",
  verifyToken,
  allowRoles(Role.ADMIN),
  validateSchema(subadminSchema),
  createSubadmin
);

router.get(
  "/admin/subadmins",
  verifyToken,
  allowRoles(Role.ADMIN),
  getSubadmins
);

router.put(
  "/admin/subadmins/:id",
  verifyToken,
  allowRoles(Role.ADMIN),
  validateSchema(updateUserSchema),
  updateSubadmin
);

router.delete(
  "/admin/subadmins/:id",
  verifyToken,
  allowRoles(Role.ADMIN),
  deleteSubadmin
);

router.get(
  "/users",
  verifyToken,
  allowRoles(Role.ADMIN, Role.SUBADMIN),
  getUsers
);

router.post("/forgot-password", sendResetPasswordEmail);

// Reset password: submit new password
router.post("/reset-password", resetPassword);

export default router;