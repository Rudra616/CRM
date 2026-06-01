import { Request, Response } from "express";
import fs from "fs";
import XLSX from "xlsx";
import { errorResponse, successResponse } from "../../common/utils/apiResponse";
import { bulkImportSchema } from "../user/user.validation";
import { importUser } from "./bulk.import.service";
import { resolveBulkImportImage } from "./bulk_import.image";
import { IMPORT_COLUMNS } from "./bulk_import.types";
import type { BulkImportSheetRow, BulkImportUser } from "./bulk_import.types";

const cell = (row: Record<string, unknown>, column: string): string =>
  String(row[column] ?? "").trim();

const isEmptyRow = (row: Record<string, unknown>): boolean =>
  Object.values(IMPORT_COLUMNS).every((col) => !cell(row, col));

const normalizeRowKeys = (row: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};

  Object.keys(row).forEach((key) => {
    const newKey = key.trim(); // <-- FIX HEADER SPACES
    cleaned[newKey] = row[key];
  });

  return cleaned;
};
/**
 * Reads and parses rows from the uploaded Excel sheet.
 *
 * @param filePath Absolute path of the uploaded file
 * @returns Array of formatted sheet rows
 */
const readSheetRows = (filePath: string) => {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

  return raw
    .map(normalizeRowKeys)
    .filter((row) => !isEmptyRow(row))
    .map((row) => ({
      row_no: Number(row["No"] ?? 0),
      first_name: cell(row, IMPORT_COLUMNS.FIRST_NAME),
      last_name: cell(row, IMPORT_COLUMNS.LAST_NAME),
      username: cell(row, IMPORT_COLUMNS.USER_NAME),
      phone: cell(row, IMPORT_COLUMNS.MOBILE_NUMBER),
      email: cell(row, IMPORT_COLUMNS.EMAIL_ADDRESS).toLowerCase(),
      gender: cell(row, IMPORT_COLUMNS.GENDER).toLowerCase(),
      sheet_status: cell(row, IMPORT_COLUMNS.STATUS).toLowerCase(),
      profile_picture: cell(row, IMPORT_COLUMNS.PROFILE_PICTURE),
    }));
};

/**
 * Converts validated sheet row data into database user format.
 *
 * @param row Validated sheet row data
 * @param image_url Resolved profile image URL
 * @returns Formatted user object for database import
 */
const toDbUser = (row: BulkImportSheetRow, image_url: string | null): BulkImportUser => ({
  username: row.username,
  first_name: row.first_name,
  last_name: row.last_name,
  phone: row.phone,
  email: row.email,
  gender: row.gender,
  image_url,
  status: row.sheet_status === "deleted" ? "inactive" : row.sheet_status,
  is_delete: row.sheet_status === "deleted" ? 1 : 0,
});

/**
 * Imports users in bulk from an uploaded Excel file.
 *
 * Reads the uploaded sheet, validates row data, resolves profile images,
 * imports users into the database, and removes the temporary upload file.
 *
 * @param req Express request object containing uploaded file
 * @param res Express response object
 * @returns Success response with imported user count or error response
 */
export const bulkimport = async (req: Request, res: Response) => {
  if (!req.file) {
    return errorResponse(res, "Please upload a file", 400);
  }

  const filePath = req.file.path;

  try {
    let rows;
    try {
      rows = readSheetRows(filePath);
    } catch {
      return errorResponse(res, "Could not read import file", 400);
    }

    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const { error, value } = bulkImportSchema.validate(
        { rows: [row] },
        { abortEarly: false }
      );

      if (error) {
        errors.push({
          row: row.row_no,
          message: error.details.map((e) => e.message).join(", "),
        });

        continue;
      }

      try {
        const validatedRow = value.rows[0] as BulkImportSheetRow;

        const image_url = validatedRow.profile_picture
          ? await resolveBulkImportImage(
            validatedRow.profile_picture,
            validatedRow.username
          )
          : null;

        await importUser(toDbUser(validatedRow, image_url));

        imported++;
      } catch (err) {
        errors.push({
          row: row.row_no,
          message: "Import failed",
        });
      }
    }
    return successResponse(
      res,
      "Bulk import completed",
      {
        imported,
        failed: errors.length,
        errors,
      },
      200
    );

  } catch (err) {
    console.error("[bulk import]", err);
    return errorResponse(res, "Import failed", 500);
  }
  finally {
    if (fs.existsSync(filePath)) { // check exist or not 
      fs.unlinkSync(filePath); // remove file 
    }
  }
};
