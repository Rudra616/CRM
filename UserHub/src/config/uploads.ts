import path from "path";

/** Always `<projectRoot>/uploads` (run server from UserHub directory). */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export type UploadAccountFolder = "user" | "admin" | "subadmin";

/**
 * Resolves the upload folder name based on user session type.
 *
 * Returns:
 * - "user" for normal users
 * - "admin" for main admins
 * - "subadmin" for staff admins
 *
 * @param user Authenticated user session object
 * @returns Upload account folder name
 */
export function uploadFolderForSession(user: {
  is_staff?: boolean;
  is_main_admin?: boolean;
}): UploadAccountFolder {
  if (!user.is_staff) return "user";
  return user.is_main_admin ? "admin" : "subadmin";
}

/**
 * Converts a stored upload path into an absolute filesystem path.
 *
 * Example:
 * uploads/admin/1/file.png → absolute disk path
 *
 * @param storedPath Relative stored upload path
 * @returns Absolute upload file path
 */
export function absoluteUploadFilePath(storedPath: string): string {
  const trimmed        = storedPath.trim().replace(/\\/g, "/");
  const withoutPrefix  = trimmed.replace(/^uploads\//i, "");
  return path.join(UPLOADS_ROOT, ...withoutPrefix.split("/").filter(Boolean));
}

/**
 * Builds a relative upload storage path for database storage.
 *
 * Example:
 * uploads/admin/1/file.png
 *
 * @param folderOrSession Upload folder name or authenticated user session
 * @param accountId User/admin account ID
 * @param filename Uploaded file name
 * @returns Relative upload storage path
 */
export function buildStoredImagePath(
  folderOrSession: UploadAccountFolder | { is_staff?: boolean; is_main_admin?: boolean },
  accountId: number,
  filename: string
): string {
  const folder =
    typeof folderOrSession === "string"
      ? folderOrSession
      : uploadFolderForSession(folderOrSession);
  return `uploads/${folder}/${accountId}/${filename}`;
}
