import path from "path";
import { Role } from "../common/types/role";

/** Always `<projectRoot>/uploads` (run server from UserHub directory). */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function uploadFolderForRole(roleId: number): string {
  if (roleId === Role.ADMIN)    return "admin";
  if (roleId === Role.SUBADMIN) return "subadmin";
  return "user";
}

/** `uploads/admin/1/file.png` → absolute path on disk */
export function absoluteUploadFilePath(storedPath: string): string {
  const trimmed        = storedPath.trim().replace(/\\/g, "/");
  const withoutPrefix  = trimmed.replace(/^uploads\//i, "");
  return path.join(UPLOADS_ROOT, ...withoutPrefix.split("/").filter(Boolean));
}

/** Relative DB path: `uploads/{folder}/{id}/{filename}`.
 *  `roleOrFolder` can be a numeric Role enum value or a plain folder string ("user", "admin", "subadmin"). */
export function buildStoredImagePath(
  roleOrFolder: number | string,
  accountId: number,
  filename: string
): string {
  const folder =
    typeof roleOrFolder === "string" ? roleOrFolder : uploadFolderForRole(roleOrFolder);
  return `uploads/${folder}/${accountId}/${filename}`;
}
