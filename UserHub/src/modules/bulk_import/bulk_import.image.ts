import fs from "fs";
import path from "path";
import { UPLOADS_ROOT } from "../../config/uploads";
// import { BULK_IMPORT_IMAGE_DIR } from "./bulk_import.constants";
import { BULK_IMPORT_IMAGE_DIR } from "./bulk_import.types";

const BULK_IMPORT_DIR = path.join(UPLOADS_ROOT, "user", "bulk_import");

/**
 * Ensures the bulk import image directory exists.
 * Creates the directory recursively if it does not exist.
 */
function ensureDir(): void {
  if (!fs.existsSync(BULK_IMPORT_DIR)) {
    fs.mkdirSync(BULK_IMPORT_DIR, { recursive: true });
  }
}

/**
 * Sanitizes username for safe filesystem usage.
 *
 * @param username Raw username
 * @returns Safe filename string
 */
function safeFilename(username: string): string {
  return username.replace(/[^\w.-]/g, "_");
}

/**
 * Extracts image extension from a URL.
 *
 * Supports jpg, jpeg, png, and webp formats.
 *
 * @param url Image URL
 * @returns File extension or null if unsupported
 */
function extFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\.(jpe?g|png|webp)$/i);
    if (!match) return null;
    const ext = match[1].toLowerCase();
    return ext === "jpeg" ? ".jpg" : `.${ext}`;
  } catch {
    return null;
  }
}

/**
 * Determines file extension from HTTP content type.
 *
 * @param type Response content type header
 * @returns Appropriate image file extension
 */
function extFromContentType(type: string | null): string {
  if (type?.includes("png")) return ".png";
  if (type?.includes("webp")) return ".webp";
  return ".jpg";
}

/**
 * Downloads a remote image and stores it in the bulk import directory.
 *
 * @param url Remote image URL
 * @param username Username used for generated filename
 * @returns Relative image path for database storage or null on failure
 */
async function download(url: string, username: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "UserHub-BulkImport/1.0" },
    });
    if (!res.ok) return null;

    const ext = extFromUrl(url) ?? extFromContentType(res.headers.get("content-type"));
    const filename = `${safeFilename(username)}${ext}`;
    const dest = path.join(BULK_IMPORT_DIR, filename);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return `${BULK_IMPORT_IMAGE_DIR}/${filename}`;
  } catch {
    return null;
  }
}

/**
 * Resolves a bulk import profile image.
 *
 * Downloads remote image URLs or validates existing local image files.
 *
 * @param profilePicture Profile picture URL or local filename
 * @param username Username associated with the image
 * @returns Database image path or null if not found/invalid
 */
export async function resolveBulkImportImage(
  profilePicture: string,
  username: string
): Promise<string | null> {
  const url = profilePicture.trim();
  if (!url || !username.trim()) return null;

  ensureDir();
  const safe = safeFilename(username.trim());

  if (/^https?:\/\//i.test(url)) {
    return download(url, safe);
  }

  const local = path.basename(url);
  const full = path.join(BULK_IMPORT_DIR, local);
  return fs.existsSync(full) ? `${BULK_IMPORT_IMAGE_DIR}/${local}` : null;
}
