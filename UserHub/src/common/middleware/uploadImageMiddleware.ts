import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    cb(null, `${date}-${Date.now()}${path.extname(file.originalname)}`);
  },
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