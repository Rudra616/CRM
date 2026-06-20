export const IMAGE_MIMETYPE = ["image/jpeg", "image/png", "image/webp"] as const;

/** Max profile image upload size (multer). */
export const IMAGE_MAX_FILE_BYTES = 2 * 1024 * 1024;

export const CSV_MIMETYPE = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/** Temp directory for uploaded import spreadsheets (under uploads/). */
export const BULK_IMPORT_UPLOADS_SUBDIR = "imports";

/** Per-admin validation uploads: uploads/imports/validation/{admin|subadmin}/{userId}/ */
export const BULK_IMPORT_VALIDATION_SUBDIR = "validation";

/** Max bulk import file (multer) and confirm JSON body — same limit. */
export const BULK_IMPORT_MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Default password pattern for newly imported users: `{username}_123`. */
export const BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX = "_123";



///** Number of rows to process before yielding to the event loop. */
export const BULK_IMPORT_BATCH_SIZE = 500;