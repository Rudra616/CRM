import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_ROOT, uploadFolderForSession } from "../../config/uploads";
import {
  BULK_IMPORT_MAX_FILE_BYTES,
  BULK_IMPORT_UPLOADS_SUBDIR,
  CSV_MIMETYPE,
  IMAGE_MAX_FILE_BYTES,
  IMAGE_MIMETYPE,
} from "../helpers/constant";
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
  /**
   * IMPORT FILE (NO USER)
   */
  if (!req.user) {
    const dir = path.join(UPLOADS_ROOT, BULK_IMPORT_UPLOADS_SUBDIR);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return cb(null, dir);
  }

  /**
   * NORMAL USER UPLOAD
   */
  const userId = req.user.id;

  const dir = path.join(
    UPLOADS_ROOT,
    uploadFolderForSession(req.user),
    String(userId)
  );

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
const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!(IMAGE_MIMETYPE as readonly string[]).includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP images are allowed"));
  }

  cb(null, true);
};
const importFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {


  if (!(CSV_MIMETYPE as readonly string[]).includes(file.mimetype)) {
    return cb(new Error("Only CSV or Excel files allowed"));
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
  fileFilter: imageFileFilter,
  limits: { fileSize: IMAGE_MAX_FILE_BYTES },
});

const importStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, BULK_IMPORT_UPLOADS_SUBDIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^\w.-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

/** Always stores under uploads/imports (even when admin is authenticated). */
export const uploadImportFile = multer({
  storage: importStorage,
  fileFilter: importFileFilter,
  limits: { fileSize: BULK_IMPORT_MAX_FILE_BYTES },
});

const multerErrorMessage = (err: { code?: string; message?: string }): string => {
  if (err.code === "LIMIT_FILE_SIZE") {
    const maxMb = Math.round(BULK_IMPORT_MAX_FILE_BYTES / (1024 * 1024));
    return `File too large. Maximum import file size is ${maxMb} MB.`;
  }
  return err.message || "File upload failed";
};

/** Wraps bulk import upload — returns JSON instead of throwing MulterError. */
export const uploadImportSingle =
  (fieldName = "file") =>
  (req: any, res: any, next: any) => {
    uploadImportFile.single(fieldName)(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: multerErrorMessage(err) });
      }
      next();
    });
  };

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