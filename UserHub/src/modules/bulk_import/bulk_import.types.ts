import { genderOptions } from "../user/user.validation";


/**
 * Allowed gender values for imported users.
 */
export type ImportGender = (typeof genderOptions)[number];

/**
 * Allowed status values from the import sheet.
 */
export type ImportSheetStatus = (typeof SHEET_STATUSES)[number];

/**
 * Allowed status values stored in the database.
 */
export type ImportDbStatus = (typeof DB_STATUSES)[number];

/**
 * Represents one normalized row parsed from the import sheet
 * before image processing or database transformation.
 */
export interface BulkImportSheetRow {
  row_no: Number,
  first_name: string;
  last_name: string;
  username: string;
  phone: string;
  email: string;
  gender: ImportGender;
  sheet_status: ImportSheetStatus;
  profile_picture: string;
}

/**
 * Represents the final payload used for database user import.
 */
export interface BulkImportUser {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: ImportGender;
  image_url: string | null;
  status: ImportDbStatus;
  is_delete: 0 | 1;
}

/**
 * Excel / CSV column headers.
 *
 * These values must exactly match the column names
 * used in the bulk import sheet.
 */
export const IMPORT_COLUMNS = {
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
  USER_NAME: "User Name",
  MOBILE_NUMBER: "Mobile Number",
  STATUS: "status",
  GENDER: "gender",
  PROFILE_PICTURE: "Profile Picture",
  EMAIL_ADDRESS: "Email Address",
} as const;

/**
 * Allowed values for the `status` column in the import sheet.
 *
 * The `deleted` status is converted to:
 * - status = "inactive"
 * - is_delete = 1
 * before database insertion/update.
 */
export const SHEET_STATUSES = [
  "active",
  "pending",
  "inactive",
  "deleted",
] as const;

/**
 * Allowed status values stored in the database.
 */
export const DB_STATUSES = [
  "active",
  "pending",
  "inactive",
] as const;

/**
 * Relative directory path used for storing
 * bulk imported profile images.
 */
export const BULK_IMPORT_IMAGE_DIR =
  "uploads/user/bulk_import";