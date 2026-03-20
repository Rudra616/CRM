const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const validateProfileImage = (file: File): { valid: boolean; message?: string } => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, message: "Only JPG, PNG, GIF, and WebP are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, message: "Image must be 2MB or smaller." };
  }
  return { valid: true };
};
