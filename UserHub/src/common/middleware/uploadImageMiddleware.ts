import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_ROOT, uploadFolderForSession } from "../../config/uploads";

/**
 * Multer disk storage configuration for uploaded images.
 *
 * Stores files inside a user-specific upload directory
 * based on authenticated session information.
 */
const storage = multer.diskStorage({
  /**
 * Resolves upload destination path for the authenticated user.
 *
 * Creates the upload directory if it does not already exist.
 *
 * @param req Incoming request containing authenticated user data
 * @param cb Multer callback used to return destination path
 */
  destination: (req: any, _file, cb) => {
    const userId = req.user?.id;
    const user = req.user;

    if (!userId || !user) {
      return cb(new Error("Missing user or user ID"), "" as unknown as string);
    }

    const dir = path.join(UPLOADS_ROOT, uploadFolderForSession(user), String(userId));

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  /**
 * Generates a unique and safe filename for uploaded files.
 *
 * Adds timestamp prefix and replaces unsafe characters
 * from the original filename.
 *
 * @param file Uploaded file metadata
 * @param cb Multer callback used to return generated filename
 */
filename: (_req, file, cb) => {
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^\w.-]/g, "_"); // replace spaces/special chars
  cb(null, `${timestamp}-${safeName}`);
}
});

/**
 * Validates uploaded file MIME types.
 *
 * Allows only JPG, PNG, and WEBP image uploads.
 *
 * @param file Uploaded file metadata
 * @param cb Multer callback used to allow or reject file
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP images are allowed"));
  }
  cb(null, true);
};

/**
 * Configured multer upload instance for image uploads.
 *
 * Includes:
 * - disk storage configuration
 * - image type validation
 * - 2MB file size limit
 */
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

/**
 * Middleware wrapper for single image uploads.
 *
 * Handles multer upload errors and returns a 400 response
 * if upload validation fails.
 *
 * @param fieldName Multipart form field name for uploaded image
 * @returns Express middleware for single file upload handling
 */
export const uploadSingle =
  (fieldName = "image") =>
  (req: any, res: any, next: any) => {
    uploadImage.single(fieldName)(req, res, (err: any) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  };