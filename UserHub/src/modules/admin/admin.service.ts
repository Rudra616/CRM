import db from "../../config/db";

export interface Admin {
  id: number;
  username: string;
  email: string;
  password: string;
  image_url?: string | null;
}

// ─── SELECT ───────────────────────────────────────────────────────────────────

export const findAdminByUsername = async (username: string): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM admin WHERE username = ?",
      [username]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findAdminByUsername:", error.message);
    throw error;
  }
};

export const findAdminById = async (id: number): Promise<Admin | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, email, image_url FROM admin WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error: any) {
    console.error("Error in findAdminById:", error.message);
    throw error;
  }
};

export const checkDuplicateAdminUsernameOrEmail = async (
  username: string,
  email: string,
  excludeId: number
): Promise<boolean> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id FROM admin WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, excludeId]
    );
    return rows.length > 0;
  } catch (error: any) {
    console.error("Error in checkDuplicateAdminUsernameOrEmail:", error.message);
    throw error;
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateAdminById = async (
  adminId: number,
  username: string,
  email: string,
  imageUrl: string | null | undefined,
  hashedPassword?: string
): Promise<void> => {
  try {
    if (hashedPassword) {
      await db.query(
        "UPDATE admin SET username=?, email=?, password=?, image_url=? WHERE id=?",
        [username, email, hashedPassword, imageUrl ?? null, adminId]
      );
    } else {
      await db.query(
        "UPDATE admin SET username=?, email=?, image_url=? WHERE id=?",
        [username, email, imageUrl ?? null, adminId]
      );
    }
  } catch (error: any) {
    console.error("Error in updateAdminById:", error.message);
    throw error;
  }
};