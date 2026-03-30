import db from "../../config/db";

/** Dedicated password updates for admin accounts (profile PUT no longer touches password). */
export const updateAdminPassword = async (
  adminId: number,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "UPDATE admin SET password = ? WHERE id = ?",
      [hashedPassword, adminId]
    );
    return result.affectedRows > 0;
  } catch (error: any) {
    console.error("Error in updateAdminPassword:", error.message);
    throw error;
  }
};
