import Joi from "joi";

const usernameRegex = /^[A-Za-z0-9]+$/;
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
}).options({ allowUnknown: true });