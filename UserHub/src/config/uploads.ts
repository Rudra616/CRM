import path from "path";

/** Always `<projectRoot>/uploads` (run server from UserHub directory). */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export type UploadAccountFolder = "user" | "admin" | "subadmin";

export function uploadFolderForSession(user: {
  is_staff?: boolean;
  is_main_admin?: boolean;
}): UploadAccountFolder {
  if (!user.is_staff) return "user";
  return user.is_main_admin ? "admin" : "subadmin";
}

/** `uploads/admin/1/file.png` → absolute path on disk */
export function absoluteUploadFilePath(storedPath: string): string {
  const trimmed        = storedPath.trim().replace(/\\/g, "/");
  const withoutPrefix  = trimmed.replace(/^uploads\//i, "");
  return path.join(UPLOADS_ROOT, ...withoutPrefix.split("/").filter(Boolean));
}

/** Relative DB path: `uploads/{folder}/{id}/{filename}`. */
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
