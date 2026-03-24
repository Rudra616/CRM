import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },

  filename: (req, file, cb) => {
    const now = new Date();

    const date =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const unique = Date.now();

    cb(null, `${date}-${unique}${path.extname(file.originalname)}`);
  },
});

// ✅ FILE VALIDATION HERE
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP images are allowed"));
  }

  cb(null, true);
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});