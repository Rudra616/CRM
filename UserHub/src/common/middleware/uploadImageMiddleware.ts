import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_ROOT, uploadFolderForRole } from "../../config/uploads";

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role == null || role === undefined) {
      return cb(new Error("Missing user ID or role"), "" as unknown as string);
    }

    const dir = path.join(UPLOADS_ROOT, uploadFolderForRole(Number(role)), String(userId));

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
filename: (_req, file, cb) => {
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^\w.-]/g, "_"); // replace spaces/special chars
  cb(null, `${timestamp}-${safeName}`);
}
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP images are allowed"));
  }
  cb(null, true);
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});
/** Convenience wrapper — handles multer errors and passes to next() */
export const uploadSingle =
  (fieldName = "image") =>
  (req: any, res: any, next: any) => {
    uploadImage.single(fieldName)(req, res, (err: any) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  };