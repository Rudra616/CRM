import path from "path";
import { StaffAuthLevel } from "../common/types/role";

/** Always `<projectRoot>/uploads` (run server from UserHub directory). */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function uploadFolderForRole(staffLevel: number): string {
  if (staffLevel === StaffAuthLevel.OWNER) return "admin";
  if (staffLevel === StaffAuthLevel.DELEGATE) return "subadmin";
  return "user";
}

/** `uploads/admin/1/file.png` → absolute path on disk */
export function absoluteUploadFilePath(storedPath: string): string {
  const trimmed        = storedPath.trim().replace(/\\/g, "/");
  const withoutPrefix  = trimmed.replace(/^uploads\//i, "");
  return path.join(UPLOADS_ROOT, ...withoutPrefix.split("/").filter(Boolean));
}

/** Relative DB path: `uploads/{folder}/{id}/{filename}`.
 *  `roleOrFolder` can be a numeric {@link StaffAuthLevel} or a folder string ("user", "admin", "subadmin"). */
export function buildStoredImagePath(
  roleOrFolder: number | string,
  accountId: number,
  filename: string
): string {
  const folder =
    typeof roleOrFolder === "string" ? roleOrFolder : uploadFolderForRole(roleOrFolder);
  return `uploads/${folder}/${accountId}/${filename}`;
}
