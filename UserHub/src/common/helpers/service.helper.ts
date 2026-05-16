import db from "../../config/db";

const ALLOWED_TABLES = ["user", "role", "broadcast", "module","admin"];

/**
 * Soft deletes a record from the specified table by setting `is_delete = 1`.
 *
 * @param table Name of the database table to update
 * @param id Unique ID of the record to soft delete
 * @returns Returns `true` if the record was successfully updated, otherwise `false`
 */
export const softDelete = async (
  table: string,
  id: number
): Promise<boolean> => {
  try {
    // Security check
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error("Invalid table name");
    }

    const [result]: any = await db.query(
      `UPDATE \`${table}\`
       SET is_delete = 1
       WHERE id = ? AND is_delete = 0`,
      [id]
    );

    return Number(result?.affectedRows ?? 0) > 0;
  } catch (error) {
    console.error(`Soft delete error in table ${table}`, error);
    throw error;
  }
};

/**
 * Checks whether duplicate records exist in the specified table
 * based on the provided field values.
 *
 * @param table Name of the database table to check
 * @param fields Object containing field names and values to compare
 * @param excludeId Optional record ID to exclude from duplicate checking
 * @returns Returns `true` if a duplicate record exists, otherwise `false`
 */
export const checkDuplicate = async (
  table: string,
  fields: Record<string, any>,
  excludeId?: number
): Promise<boolean> => {
  try {
    // Security check
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error("Invalid table name");
    }

    const conditions = Object.keys(fields)
      .map((key) => `${key} = ?`)
      .join(" OR ");

    const values = Object.values(fields);

    let query = `
      SELECT id
      FROM \`${table}\`
      WHERE (${conditions})
      AND COALESCE(is_delete, 0) = 0
    `;

    if (excludeId) {
      query += " AND id != ?";
      values.push(excludeId);
    }

    const [rows]: any = await db.query(query, values);

    return rows.length > 0;
  } catch (error) {
    console.error(`Duplicate check error in table ${table}`, error);
    throw error;
  }
};