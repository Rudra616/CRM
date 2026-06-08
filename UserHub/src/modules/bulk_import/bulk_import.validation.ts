import Joi from "joi";
import { bulkImportSchema } from "../user/user.validation";
import type {
  BulkImportPendingRow,
  BulkImportRowError,
  BulkImportSheetRow,
  BulkImportUser,
} from "./bulk_import.types";

/**
 * Maps a validated sheet row to the database user shape (no image yet).
 *
 * @param row Normalized sheet row
 * @param image_url Resolved image path or null
 * @returns User fields for insert/update
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
 * Finds duplicate usernames or emails within the same uploaded file.
 *
 * @param rows Parsed sheet rows
 * @returns Map of sheet row number → error messages
 */
export const sheetDuplicateErrors = (rows: BulkImportSheetRow[]): Map<number, string[]> => {
  const byUser = new Map<string, number[]>();
  const byEmail = new Map<string, number[]>();
  const out = new Map<number, string[]>();

  const add = (rowNo: number, msg: string) => {
    const list = out.get(rowNo) ?? [];
    if (!list.includes(msg)) list.push(msg);
    out.set(rowNo, list);
  };

  for (const r of rows) {
    const n = Number(r.row_no) || 0;
    if (r.username) {
      const a = byUser.get(r.username) ?? [];
      a.push(n);
      byUser.set(r.username, a);
    }
    if (r.email) {
      const a = byEmail.get(r.email) ?? [];
      a.push(n);
      byEmail.set(r.email, a);
    }
  }

  for (const nums of byUser.values()) {
    if (nums.length > 1) nums.forEach((n) => add(n, "Duplicate username in file"));
  }
  for (const nums of byEmail.values()) {
    if (nums.length > 1) nums.forEach((n) => add(n, "Duplicate email in file"));
  }

  return out;
};

/**
 * Maps Joi validation errors back to sheet row numbers for the validate response.
 *
 * @param rows Parsed sheet rows (same order as Joi `rows` array)
 * @param error Joi validation error from {@link bulkImportSchema}
 * @returns Map of sheet row number → error messages
 */
export const joiErrorsByRow = (
  rows: BulkImportSheetRow[],
  error: Joi.ValidationError
): Map<number, string[]> => {
  const map = new Map<number, string[]>();
  for (const d of error.details) {
    const idx = d.path[0] === "rows" && typeof d.path[1] === "number" ? d.path[1] : -1;
    const rowNo = idx >= 0 ? Number(rows[idx]?.row_no ?? 0) : 0;
    const list = map.get(rowNo) ?? [];
    list.push(d.message.replace(/"/g, ""));
    map.set(rowNo, list);
  }
  return map;
};

/** Output of {@link validateImportSheet} — errors and confirm-ready rows. */
export type SheetValidationResult = {
  errors: BulkImportRowError[];
  rows: BulkImportPendingRow[];
  summary: {
    total: number;
    valid: number;
    validationErrors: number;
  };
};

/**
 * Validates an import sheet without touching the database.
 * Combines Joi rules ({@link bulkImportSchema}) with in-file duplicate detection.
 *
 * @param sheetRows Rows parsed from the uploaded CSV/Excel file
 * @returns Flat error list and valid rows for confirm
 */
export const validateImportSheet = (sheetRows: BulkImportSheetRow[]): SheetValidationResult => {
  const dupErrors = sheetDuplicateErrors(sheetRows);
  const { error } = bulkImportSchema.validate({ rows: sheetRows }, { abortEarly: false });
  const joiMap = error ? joiErrorsByRow(sheetRows, error) : new Map<number, string[]>();

  const rowErrors = new Map<number, string[]>();
  const merge = (rowNo: number, msgs: string[]) => {
    const cur = rowErrors.get(rowNo) ?? [];
    rowErrors.set(rowNo, [...cur, ...msgs.filter((m) => !cur.includes(m))]);
  };
  dupErrors.forEach((msgs, rowNo) => merge(rowNo, msgs));
  joiMap.forEach((msgs, rowNo) => merge(rowNo, msgs));

  const errors: BulkImportRowError[] = [];
  const rows: BulkImportPendingRow[] = [];
  let validationErrorRows = 0;

  for (const row of sheetRows) {
    const rowNo = Number(row.row_no) || 0;
    const msgs = rowErrors.get(rowNo) ?? [];

    if (msgs.length) {
      validationErrorRows += 1;
      msgs.forEach((m) => errors.push({ row: rowNo, message: m }));
      continue;
    }

    rows.push({
      ...toDbUser(row, null),
      row_no: rowNo,
      profile_picture: row.profile_picture,
    });
  }

  return {
    errors,
    rows,
    summary: {
      total: sheetRows.length,
      valid: rows.length,
      validationErrors: validationErrorRows,
    },
  };
};
