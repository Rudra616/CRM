import db from "../../config/db";

export type BulkImportRecord = {
  id: number;
  file_name: string;
  file_path: string;
  validation_file_path: string | null;
  status: string;
  current_batch: number;
  created_by: number;
  total_rows: number;
  valid_rows: number;
  validation_error_rows: number;
  created_at?: string;
};

type CreateBulkImportInput = {
  fileName: string;
  filePath: string;
  validationFilePath: string | null;
  createdBy: number;
  totalRows: number;
  validRows: number;
  validationErrorRows: number;
};

const mapRow = (row: Record<string, unknown>): BulkImportRecord => ({
  id: Number(row.id),
  file_name: String(row.file_name ?? ""),
  file_path: String(row.file_path ?? ""),
  validation_file_path: row.validation_file_path
    ? String(row.validation_file_path)
    : null,
  status: String(row.status ?? "pending"),
  current_batch: Number(row.current_batch ?? 0),
  created_by: Number(row.created_by),
  total_rows: Number(row.total_rows ?? 0),
  valid_rows: Number(row.valid_rows ?? 0),
  validation_error_rows: Number(row.validation_error_rows ?? 0),
  created_at: row.created_at ? String(row.created_at) : undefined,
});

export const createBulkImportRecord = async (
  input: CreateBulkImportInput
): Promise<number> => {
  try {
    const [result]: any = await db.query(
      `INSERT INTO user_bulk_imports (
        file_name,
        file_path,
        validation_file_path,
        status,
        current_batch,
        created_by,
        total_rows,
        valid_rows,
        validation_error_rows
      ) VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?)`,
      [
        input.fileName,
        input.filePath,
        input.validationFilePath,
        input.createdBy,
        input.totalRows,
        input.validRows,
        input.validationErrorRows,
      ]
    );
    return Number(result.insertId);
  } catch {
    const [result]: any = await db.query(
      `INSERT INTO user_bulk_imports (
        file_name,
        file_path,
        validation_file_path,
        status,
        current_batch,
        created_by
      ) VALUES (?, ?, ?, 'pending', 0, ?)`,
      [
        input.fileName,
        input.filePath,
        input.validationFilePath,
        input.createdBy,
      ]
    );
    const importId = Number(result.insertId);
    try {
      await db.query(
        `UPDATE user_bulk_imports
         SET total_rows = ?, valid_rows = ?, validation_error_rows = ?
         WHERE id = ?`,
        [
          input.totalRows,
          input.validRows,
          input.validationErrorRows,
          importId,
        ]
      );
    } catch {
      /* summary columns optional */
    }
    return importId;
  }
};

export const listBulkImportsByAdmin = async (
  adminId: number
): Promise<BulkImportRecord[]> => {
  const [rows]: any = await db.query(
    `SELECT * FROM user_bulk_imports WHERE created_by = ? ORDER BY id DESC LIMIT 100`,
    [adminId]
  );
  return (rows as Record<string, unknown>[]).map(mapRow);
};

export const findBulkImportForAdmin = async (
  importId: number,
  adminId: number
): Promise<BulkImportRecord | null> => {
  const [rows]: any = await db.query(
    `SELECT * FROM user_bulk_imports WHERE id = ? AND created_by = ? LIMIT 1`,
    [importId, adminId]
  );
  const row = (rows as Record<string, unknown>[])[0];
  return row ? mapRow(row) : null;
};

export const updateBulkImportStatus = async (
  importId: number,
  status: string
): Promise<void> => {
  await db.query(`UPDATE user_bulk_imports SET status = ? WHERE id = ?`, [
    status,
    importId,
  ]);
};
