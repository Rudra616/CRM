import Joi from "joi";

const usernameRegex = /^[A-Za-z0-9]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const updateAdminSchema = Joi.object({
  username: Joi.string().min(3).max(50).pattern(usernameRegex).required().messages({
    "string.empty":        "Username is required",
    "string.min":          "Username must be at least 3 characters",
    "string.max":          "Username must be at most 50 characters",
    "string.pattern.base": "Username must contain only letters and numbers",
  }),
  email: Joi.string().min(5).max(100).email().required().messages({
    "string.empty": "Email is required",
    "string.min":   "Email is too short",
    "string.max":   "Email must be at most 100 characters",
    "string.email": "Invalid email format",
  }),
  password: Joi.string().allow("", null).optional().min(8).max(255).pattern(passwordRegex).messages({
    "string.min":          "Password must be at least 8 characters",
    "string.max":          "Password must be at most 255 characters",
    "string.pattern.base": "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
  }),
}).options({ allowUnknown: true });