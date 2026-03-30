import path from "path";
import { Role } from "../common/types/role";

/** Always `<projectRoot>/uploads` (run server from UserHub directory). */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function uploadFolderForRole(roleId: number): string {
  if (roleId === Role.ADMIN) return "admin";
  if (roleId === Role.SUBADMIN) return "subadmin";
  return "user";
}

/** Stored value like `uploads/admin/1/file.png` → absolute path on disk */
export function absoluteUploadFilePath(storedPath: string): string {
  const trimmed = storedPath.trim().replace(/\\/g, "/");
  const withoutPrefix = trimmed.replace(/^uploads\//i, "");
  return path.join(UPLOADS_ROOT, ...withoutPrefix.split("/").filter(Boolean));
}

/** Relative DB path segments: uploads/{admin|subadmin|user}/{id}/{filename} */
export function buildStoredImagePath(
  roleId: number,
  accountId: number,
  filename: string
): string {
  const folder = uploadFolderForRole(roleId);
  return `uploads/${folder}/${accountId}/${filename}`;
}
