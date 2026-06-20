import path from "path";
import fs from "fs";
import { UPLOADS_ROOT, uploadFolderForSession } from "../../config/uploads";
import {
  BULK_IMPORT_UPLOADS_SUBDIR,
  BULK_IMPORT_VALIDATION_SUBDIR,
} from "../../common/helpers/constant";
import type { AuthRequest } from "../../common/types/AuthRequest";
import type { BulkImportRowError } from "./bulk_import.types";

type SessionUser = NonNullable<AuthRequest["user"]>;

/**
 * Absolute disk directory for one admin's bulk-import validation files.
 * Example: uploads/imports/validation/admin/3/
 */
export const bulkImportValidationDir = (user: SessionUser): string =>
  path.join(
    UPLOADS_ROOT,
    BULK_IMPORT_UPLOADS_SUBDIR,
    BULK_IMPORT_VALIDATION_SUBDIR,
    uploadFolderForSession(user),
    String(user.id)
  );

/**
 * Ensures the per-user validation upload directory exists.
 */
export const ensureBulkImportValidationDir = (user: SessionUser): string => {
  const dir = bulkImportValidationDir(user);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/**
 * Relative path stored in DB (under project uploads root).
 * Example: uploads/imports/validation/admin/3/1710000000-file.csv
 */
export const bulkImportValidationStoredPath = (
  user: SessionUser,
  filename: string
): string => {
  const folder = uploadFolderForSession(user);
  return `uploads/${BULK_IMPORT_UPLOADS_SUBDIR}/${BULK_IMPORT_VALIDATION_SUBDIR}/${folder}/${user.id}/${filename}`;
};

const csvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** Builds a CSV file body for validation errors (header: Row, Error). */
export const bulkImportErrorsToCsv = (errors: BulkImportRowError[]): string => {
  const lines = ["Row,Error", ...errors.map((e) => `${e.row},${csvCell(e.message)}`)];
  return `${lines.join("\n")}\n`;
};

/**
 * Writes validation errors as CSV next to the uploaded import file.
 *
 * @returns Relative stored path for `validation_file_path`
 */
export const writeBulkImportValidationErrorsCsv = (
  user: SessionUser,
  uploadedFilePath: string,
  errors: BulkImportRowError[]
): string => {
  const validationFileName = `${Date.now()}-validation-errors.csv`;
  const validationAbsPath = path.join(path.dirname(uploadedFilePath), validationFileName);
  fs.writeFileSync(validationAbsPath, bulkImportErrorsToCsv(errors), "utf8");
  return bulkImportValidationStoredPath(user, validationFileName);
};
