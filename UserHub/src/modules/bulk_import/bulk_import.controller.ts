import { Request, Response } from "express";
import fs from "fs";
import { setImmediate } from "timers";
import XLSX from "xlsx";
import { errorResponse, successResponse } from "../../common/utils/apiResponse";
import type { AuthRequest } from "../../common/types/AuthRequest";
import { executeBulkImport } from "./bulk_import.service";
import { emitBulkImportFinished } from "./bulk_import.socket";
import { validateImportSheet } from "./bulk_import.validation";
import { IMPORT_COLUMNS } from "./bulk_import.types";
import type { BulkImportPendingRow, BulkImportSheetRow } from "./bulk_import.types";

/**
 * Reads and trims a single cell value from a parsed sheet row.
 *
 * @param row Parsed row object keyed by column header
 * @param column Column header name
 * @returns Trimmed string value (empty string if missing)
 */
const cell = (row: Record<string, unknown>, column: string) =>
  String(row[column] ?? "").trim();

/**
 * Parses the first worksheet of an uploaded CSV/Excel file into normalized sheet rows.
 * Skips completely empty rows and maps columns via {@link IMPORT_COLUMNS}.
 *
 * @param filePath Absolute path to the uploaded file on disk
 * @returns Normalized rows ready for Joi validation
 */
const readSheetRows = (filePath: string): BulkImportSheetRow[] => {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

  return raw
    .map((row) => {
      const cleaned: Record<string, unknown> = {};
      Object.keys(row).forEach((k) => {
        cleaned[k.trim()] = row[k];
      });
      return cleaned;
    })
    .filter((row) => !Object.values(IMPORT_COLUMNS).every((col) => !cell(row, col)))
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
    })) as BulkImportSheetRow[];
};

/**
 * Builds the human-readable summary message emitted when a background import finishes.
 *
 * @param total Total rows in the original upload (including validation skips)
 * @param skippedValidation Rows excluded during the validate step
 * @param outcome Insert/update counts from {@link executeBulkImport}
 * @returns Summary string for socket toast and logs
 */
const buildFinishMessage = (
  total: number,
  skippedValidation: number,
  outcome: {
    imported: number;
    inserted: number;
    updated: number;
    notImported: number;
  }
): string => {
  const base = `Total: ${total}, skipped (validation): ${skippedValidation}. Saved: ${outcome.imported} (${outcome.inserted} inserted, ${outcome.updated} updated).`;
  if (outcome.notImported > 0) {
    return `${base} Failed on import: ${outcome.notImported}.`;
  }
  return base;
};

/**
 * Runs {@link executeBulkImport} on the next event-loop tick and notifies the admin via socket.
 *
 * @param adminId Main admin user ID (socket room `user:{id}`)
 * @param rows Validated rows from the confirm request body
 * @param total Total row count from the original upload
 * @param skippedValidation Rows skipped during validation
 */
const runImportInBackground = (
  adminId: number,
  rows: BulkImportPendingRow[],
  total: number,
  skippedValidation: number
): void => {
  setImmediate(() => {
        console.log("[bulk import] background job started", {
      adminId,
      totalRows: rows.length,
      skippedValidation,
      time: new Date().toISOString(),
    });

    void (async () => {
      try {
        const outcome = await executeBulkImport(rows);
        const message = buildFinishMessage(total, skippedValidation, outcome);

        emitBulkImportFinished(adminId, {
          success: true,
          message,
          total,
          skippedValidation,
          submitted: outcome.submitted,
          inserted: outcome.inserted,
          updated: outcome.updated,
          imported: outcome.imported,
          notImported: outcome.notImported,
        });
      } catch (err) {
        console.error("[bulk import background]", err);
        const message =
          err instanceof Error
            ? err.message
            : "Import failed";
        emitBulkImportFinished(adminId, {
          success: false,
          message,
          total,
          skippedValidation,
          submitted: rows.length,
          inserted: 0,
          updated: 0,
          imported: 0,
          notImported: 0,
        });
      }
    })();
  });
};

/**
 * Validates an uploaded import file (CSV/Excel) without writing to the database.
 * Parses the sheet, runs Joi + duplicate checks, and returns errors plus confirm-ready rows.
 *
 * @param req Multipart request with `file` field (multer) and authenticated main admin
 * @param res Express response
 * @returns Errors, summary, and `rows` payload for a later confirm call
 */
export const validateBulkImport = (req: Request, res: Response) => {
  if (!req.file) return errorResponse(res, "Please upload a file", 400);

  const authReq = req as AuthRequest;
  const adminId = authReq.user?.id;
  if (!adminId) return errorResponse(res, "Unauthorized", 401);

  const filePath = req.file.path;

  try {
    let sheetRows: BulkImportSheetRow[];
    try {
      sheetRows = readSheetRows(filePath);
    } catch {
      return errorResponse(res, "Could not read import file", 400);
    }

    if (sheetRows.length === 0) {
      return errorResponse(res, "No data found in file", 400);
    }

    const { errors, rows, summary } = validateImportSheet(sheetRows);

    const message =
      errors.length > 0
        ? "Validation completed with errors — review before confirming"
        : "Validation successful — review and confirm";

    return successResponse(res, message, {
      summary: {
        total: summary.total,
        valid: summary.valid,
        validationErrors: summary.validationErrors,
        toInsert: 0,
        toUpdate: 0,
      },
      errors,
      rows,
    });
  } catch (err) {
    console.error("[bulk import validate]", err);
    return errorResponse(res, "Validation failed", 500);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

/**
 * Accepts validated rows and starts the database import in the background.
 * Responds immediately; completion is pushed via `bulk_import_finished` socket event.
 *
 * @param req JSON body with `rows`, optional `total` and `skippedValidation`
 * @param res Express response
 * @returns `{ started: true, submitted }` before background work begins
 */
export const confirmBulkImport = (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;

  const rows = req.body?.rows as BulkImportPendingRow[] | undefined;
  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse(res, "No rows to import. Please validate the file again.", 400);
  }

  const total = Number(req.body?.total ?? rows.length);
  const skippedValidation = Number(req.body?.skippedValidation ?? 0);

  const message =
    "Import started. Processing in the background — you will be notified when it finishes.";

  successResponse(res, message, { started: true, submitted: rows.length });

  runImportInBackground(adminId, rows, total, skippedValidation);
};
