import db from "../../config/db";
import { BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX } from "../../common/helpers/constant";
import { hashPassword } from "../../common/helpers/common.helper";
import { resolveBulkImportImage } from "./bulk_import.image";
import type { BulkImportPendingRow, BulkImportRowError } from "./bulk_import.types";

/** Rows processed per batch before yielding the event loop. */
const YIELD_EVERY = 20;

/** Yields control so long imports do not block the Node.js event loop. */
const yieldEventLoop = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

/** SQL fragment for profile fields updated on existing users during bulk import. */
const PROFILE_SET_SQL = `
  first_name = ?,
  last_name = ?,
  phone = ?,
  gender = ?,
  image_url = ?,
  status = ?,
  is_delete = ?
`;

/**
 * Builds ordered query parameters for a profile UPDATE.
 *
 * @param row Pending row with resolved image and status fields
 * @returns Values matching {@link PROFILE_SET_SQL} column order
 */
const profileParams = (row: BulkImportPendingRow) => [
  row.first_name,
  row.last_name,
  row.phone,
  row.gender,
  row.image_url,
  row.status,
  row.is_delete,
];

/**
 * Loads existing users by username or email to decide insert vs update per row.
 *
 * @param rows Pending import rows from the confirm step
 * @returns Lookup maps keyed by username and lowercased email
 */
const loadExistingUsers = async (rows: BulkImportPendingRow[]) => {
  const usernames = rows.map((r) => r.username);
  const emails = rows.map((r) => r.email);

  const [existing]: any = await db.query(
    `SELECT id, username, email FROM user WHERE username IN (?) OR email IN (?)`,
    [usernames, emails]
  );

  const byUsername = new Map<string, number>();
  const byEmail = new Map<string, number>();
  for (const u of existing as { id: number; username: string; email: string }[]) {
    byUsername.set(u.username, u.id);
    byEmail.set(u.email.toLowerCase(), u.id);
  }
  return { byUsername, byEmail };
};

/**
 * Assigns `action` (`insert` | `update`) and flags username/email conflicts.
 *
 * @param rows Pending rows to prepare
 * @param errors Mutable list; conflict rows are appended and excluded from output
 * @returns Rows ready for image resolution and DB writes
 */
const prepareRowsForDb = async (
  rows: BulkImportPendingRow[],
  errors: BulkImportRowError[]
): Promise<BulkImportPendingRow[]> => {
  const { byUsername, byEmail } = await loadExistingUsers(rows);
  const ready: BulkImportPendingRow[] = [];

  for (const row of rows) {
    const usernameId = byUsername.get(row.username);
    const emailId = byEmail.get(row.email);

    if (usernameId && emailId && usernameId !== emailId) {
      errors.push({
        row: row.row_no,
        message: "Username and email match different existing users",
      });
      continue;
    }

    const existingId = usernameId ?? emailId;
    ready.push({
      ...row,
      action: existingId ? "update" : "insert",
      existing_user_id: existingId,
    });
  }

  return ready;
};

/**
 * Resolves profile picture URLs or local filenames into stored `image_url` paths.
 *
 * @param rows Rows mutated in place with `image_url` set or null on failure
 */
const resolveRowImages = async (rows: BulkImportPendingRow[]): Promise<void> => {
  for (let i = 0; i < rows.length; i += YIELD_EVERY) {
    const batch = rows.slice(i, i + YIELD_EVERY);
    await Promise.all(
      batch.map(async (row) => {
        if (!row.profile_picture?.trim()) {
          row.image_url = null;
          return;
        }
        try {
          row.image_url = await resolveBulkImportImage(
            row.profile_picture,
            row.username
          );
        } catch {
          row.image_url = null;
        }
      })
    );
    await yieldEventLoop();
  }
};

/**
 * Bulk-inserts new users with default password `{username}{BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX}`.
 *
 * @param rows Rows marked `action: "insert"`
 */
export const bulkInsertUsers = async (rows: BulkImportPendingRow[]): Promise<void> => {
  if (rows.length === 0) return;

  const insertValues: unknown[][] = [];
  for (let i = 0; i < rows.length; i += YIELD_EVERY) {
    const batch = rows.slice(i, i + YIELD_EVERY);
    const batchValues = await Promise.all(
      batch.map(async (u) => {
        const hashedPassword = await hashPassword(
          `${u.username}${BULK_IMPORT_DEFAULT_PASSWORD_SUFFIX}`
        );
        return [
          u.username,
          hashedPassword,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.gender,
          u.image_url,
          u.status,
          u.is_delete,
        ];
      })
    );
    insertValues.push(...batchValues);
    await yieldEventLoop();
  }

  await db.query(
    `
    INSERT INTO user (
      username, password, first_name, last_name, phone, email,
      gender, image_url, status, is_delete, created_at, updated_at
    ) VALUES ?
    `,
    [insertValues.map((row) => [...row, new Date(), new Date()])]
  );
};

/**
 * Updates existing users one row per query inside a single transaction.
 *
 * @param rows Rows marked `action: "update"` with `existing_user_id` set
 */
export const bulkUpdateUsers = async (rows: BulkImportPendingRow[]): Promise<void> => {
  if (!rows.length) return;

  const clean = (v: any, fallback = "") =>
    v === undefined || v === null || v === "" ? fallback : v;

  const ids = rows
    .map(r => r.existing_user_id)
    .filter((id): id is number => typeof id === "number");

  if (!ids.length) return;

  const buildCase = (field: keyof BulkImportPendingRow) => {
    const cases: string[] = [];
    const params: any[] = [];

    for (const row of rows) {
      const id = row.existing_user_id;
      if (!id) continue;

      const value = clean(row[field]);

      cases.push("WHEN ? THEN ?");
      params.push(id, value);
    }

    return {
      sql: `CASE id ${cases.join(" ")} END`,
      params,
    };
  };

  const first = buildCase("first_name");
  const last = buildCase("last_name");
  const phone = buildCase("phone");
  const gender = buildCase("gender");
  const image = buildCase("image_url");
  const status = buildCase("status");

  const deleteCase = buildCase("is_delete");

  const sql = `
    UPDATE user
    SET
      first_name = ${first.sql},
      last_name = ${last.sql},
      phone = ${phone.sql},
      gender = ${gender.sql},
      image_url = ${image.sql},
      status = ${status.sql},
      is_delete = ${deleteCase.sql},
      updated_at = NOW()
    WHERE id IN (${ids.map(() => "?").join(",")})
  `;

  const params = [
    ...first.params,
    ...last.params,
    ...phone.params,
    ...gender.params,
    ...image.params,
    ...status.params,
    ...deleteCase.params,
    ...ids
  ];

  await db.query(sql, params);
};
/** Result counts returned after a confirm-step import run. */
export type ExecuteBulkImportOutput = {
  submitted: number;
  inserted: number;
  updated: number;
  imported: number;
  notImported: number;
  errors: BulkImportRowError[];
};

/**
 * Main import pipeline: resolve conflicts, images, then bulk insert and/or update.
 *
 * @param rows Validated pending rows from the confirm request
 * @returns Counts and per-row errors (e.g. username/email conflict)
 */
export const executeBulkImport = async (
  rows: BulkImportPendingRow[]
): Promise<ExecuteBulkImportOutput> => {
  const errors: BulkImportRowError[] = [];
  const prepared = await prepareRowsForDb(rows, errors);

  const submitted = rows.length;

  if (prepared.length === 0) {
    return {
      submitted,
      inserted: 0,
      updated: 0,
      imported: 0,
      notImported: errors.length,
      errors,
    };
  }

  try {
    await resolveRowImages(prepared);
  } catch (err) {
    console.error("[bulk import] image resolution", err);
  }

  const toInsert = prepared.filter((r) => r.action === "insert");
  const toUpdate = prepared.filter(
    (r) => r.action === "update" && r.existing_user_id != null
  );

  try {
    if (toInsert.length > 0) {
      await bulkInsertUsers(toInsert);
    }
    if (toUpdate.length > 0) {
      await bulkUpdateUsers(toUpdate);
    }
  } catch (err) {
    console.error("[bulk import] execute", err);
    throw err;
  }

  const inserted = toInsert.length;
  const updated = toUpdate.length;

  return {
    submitted,
    inserted,
    updated,
    imported: inserted + updated,
    notImported: errors.length,
    errors,
  };
};




