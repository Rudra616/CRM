import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { setImmediate } from "timers";
import XLSX from "xlsx";

import { errorResponse, successResponse } from "../../common/utils/apiResponse";
import type { AuthRequest } from "../../common/types/AuthRequest";
import { absoluteUploadFilePath } from "../../config/uploads";

import { executeBulkImport } from "./bulk_import.service";
import { emitBulkImportFinished } from "./bulk_import.socket";
import {
  bulkImportValidationStoredPath,
  writeBulkImportValidationErrorsCsv,
} from "./bulk_import.storage";
import {
  createBulkImportRecord,
  findBulkImportForAdmin,
  listBulkImportsByAdmin,
  updateBulkImportStatus,
} from "./bulk_import.repository";
import { validateImportSheet } from "./bulk_import.validation";
import { IMPORT_COLUMNS } from "./bulk_import.types";

import type {
  BulkImportPendingRow,
  BulkImportSheetRow,
} from "./bulk_import.types";

const cell = (row: Record<string, unknown>, column: string) =>
  String(row[column] ?? "").trim();

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
    .filter((row) =>
      !Object.values(IMPORT_COLUMNS).every((col) => !cell(row, col))
    )
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

const runImportInBackground = (
  adminId: number,
  importId: number,
  rows: BulkImportPendingRow[],
  total: number,
  skippedValidation: number
): void => {
  setImmediate(() => {
    void (async () => {
      try {
        const outcome = await executeBulkImport(rows);
        const message = buildFinishMessage(total, skippedValidation, outcome);

        await updateBulkImportStatus(importId, "completed");

        emitBulkImportFinished(adminId, {
          success: true,
          message,
          importId,
          total,
          skippedValidation,
          submitted: outcome.submitted,
          inserted: outcome.inserted,
          updated: outcome.updated,
          imported: outcome.imported,
          notImported: outcome.notImported,
        });
      } catch (err) {
        await updateBulkImportStatus(importId, "failed");

        emitBulkImportFinished(adminId, {
          success: false,
          message: err instanceof Error ? err.message : "Import failed",
          importId,
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

const sendStoredFile = (
  res: Response,
  storedPath: string,
  downloadName: string,
  download: boolean
): void => {
  const abs = absoluteUploadFilePath(storedPath);
  if (!fs.existsSync(abs)) {
    errorResponse(res, "File not found", 404);
    return;
  }

  const disposition = download ? "attachment" : "inline";
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${path.basename(downloadName)}"`
  );
  res.sendFile(abs);
};

/** GET /api/bulkimport — list imports for the current main admin. */
export const listBulkImports = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const items = await listBulkImportsByAdmin(adminId);
  return successResponse(res, "Bulk imports loaded", { items });
};

/** POST /api/bulkimport/validate — upload and validate CSV/Excel. */
export const validateBulkImport = async (req: Request, res: Response) => {
  if (!req.file) return errorResponse(res, "Please upload a file", 400);

  const authReq = req as AuthRequest;
  const admin = authReq.user;

  if (!admin?.id) return errorResponse(res, "Unauthorized", 401);

  const filePath = req.file.path;
  const storedFilePath = bulkImportValidationStoredPath(admin, req.file.filename);

  try {
    let sheetRows: BulkImportSheetRow[];

    try {
      sheetRows = readSheetRows(filePath);
    } catch {
      return errorResponse(res, "Could not read import file", 400);
    }

    if (!sheetRows.length) {
      return errorResponse(res, "No data found in file", 400);
    }

    const { errors, rows, summary } = validateImportSheet(sheetRows);

    let validationStoredPath: string | null = null;

    if (errors.length > 0) {
      validationStoredPath = writeBulkImportValidationErrorsCsv(admin, filePath, errors);
    }

    const importId = await createBulkImportRecord({
      fileName: req.file.originalname,
      filePath: storedFilePath,
      validationFilePath: validationStoredPath,
      createdBy: admin.id,
      totalRows: summary.total,
      validRows: summary.valid,
      validationErrorRows: summary.validationErrors,
    });

    const message =
      errors.length > 0
        ? "Validation completed with errors — confirm from the table when ready"
        : "Validation successful — confirm from the table when ready";

    return successResponse(res, message, {
      importId,
      summary: {
        total: summary.total,
        valid: summary.valid,
        validationErrors: summary.validationErrors,
      },
    });
  } catch (err) {
    console.error("[bulk import validate]", err);
    return errorResponse(res, "Validation failed", 500);
  }
};

/** POST /api/bulkimport/:id/confirm — confirm one import row from the table. */
export const confirmBulkImportById = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const importId = Number(req.params.id);

  if (!Number.isFinite(importId) || importId <= 0) {
    return errorResponse(res, "Invalid import id", 400);
  }

  const record = await findBulkImportForAdmin(importId, adminId);
  if (!record) {
    return errorResponse(res, "Import not found", 404);
  }

  if (record.status === "processing") {
    return errorResponse(res, "Import is already running", 400);
  }

  if (record.status === "completed") {
    return errorResponse(res, "Import already completed", 400);
  }

  if (record.status === "failed") {
    await updateBulkImportStatus(importId, "pending");
  }

  const absPath = absoluteUploadFilePath(record.file_path);
  if (!fs.existsSync(absPath)) {
    return errorResponse(res, "Import file missing on server", 400);
  }

  let sheetRows: BulkImportSheetRow[];
  try {
    sheetRows = readSheetRows(absPath);
  } catch {
    return errorResponse(res, "Could not read import file", 400);
  }

  const { rows, summary } = validateImportSheet(sheetRows);

  if (!rows.length) {
    return errorResponse(res, "No valid rows to import. Fix validation errors first.", 400);
  }

  await updateBulkImportStatus(importId, "processing");

  successResponse(res, "Import started", {
    started: true,
    importId,
    submitted: rows.length,
  });

  runImportInBackground(
    adminId,
    importId,
    rows,
    summary.total,
    summary.validationErrors
  );
};

/** GET /api/bulkimport/:id/file — open uploaded import file. */
export const openBulkImportFile = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const importId = Number(req.params.id);
  const record = await findBulkImportForAdmin(importId, adminId);

  if (!record) return errorResponse(res, "Import not found", 404);

  sendStoredFile(res, record.file_path, record.file_name, false);
};

/** GET /api/bulkimport/:id/file/download — download uploaded import file. */
export const downloadBulkImportFile = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const importId = Number(req.params.id);
  const record = await findBulkImportForAdmin(importId, adminId);

  if (!record) return errorResponse(res, "Import not found", 404);

  sendStoredFile(res, record.file_path, record.file_name, true);
};

/** GET /api/bulkimport/:id/validation — open validation errors CSV. */
export const openBulkImportValidationFile = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const importId = Number(req.params.id);
  const record = await findBulkImportForAdmin(importId, adminId);

  if (!record) return errorResponse(res, "Import not found", 404);
  if (!record.validation_file_path) {
    return errorResponse(res, "No validation file for this import", 404);
  }

  const name = path.basename(record.validation_file_path);
  sendStoredFile(res, record.validation_file_path, name, false);
};

/** GET /api/bulkimport/:id/validation/download — download validation errors CSV. */
export const downloadBulkImportValidationFile = async (req: Request, res: Response) => {
  const adminId = (req as AuthRequest).user!.id;
  const importId = Number(req.params.id);
  const record = await findBulkImportForAdmin(importId, adminId);

  if (!record) return errorResponse(res, "Import not found", 404);
  if (!record.validation_file_path) {
    return errorResponse(res, "No validation file for this import", 404);
  }

  const name = path.basename(record.validation_file_path);
  sendStoredFile(res, record.validation_file_path, name, true);
};
