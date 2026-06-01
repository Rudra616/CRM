import Joi from "joi";

const nameRegex     = /^[A-Za-z]+$/;
const usernameRegex = /^[A-Za-z0-9]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const phoneRegex    = /^[0-9]+$/;
export const genderOptions = ["male", "female", "other"] as const;

export const trimmedString = () => Joi.string().trim();

export const usernameField = trimmedString().min(3).max(50).pattern(usernameRegex).required().messages({
  "string.empty":        "Username is required",
  "string.min":          "Username must be at least 3 characters",
  "string.max":          "Username must be at most 50 characters",
  "string.pattern.base": "Username must contain only letters and numbers",
});

export const firstNameField = trimmedString().min(1).max(50).pattern(nameRegex).required().messages({
  "string.empty":        "First name is required",
  "string.pattern.base": "First name must contain only letters",
});

export const lastNameField = trimmedString().min(1).max(50).pattern(nameRegex).required().messages({
  "string.empty":        "Last name is required",
  "string.pattern.base": "Last name must contain only letters",
});

export const phoneField = trimmedString().length(10).pattern(phoneRegex).required().messages({
  "string.length":       "Phone must be exactly 10 digits",
  "string.pattern.base": "Phone must contain only numbers",
});

export const emailField = trimmedString().min(5).max(100).email().required().messages({
  "string.empty": "Email is required",
  "string.email": "Invalid email format",
});

const passwordField = (maxLen = 256) =>
  trimmedString().min(8).max(maxLen).pattern(passwordRegex).required().messages({
    "string.empty":        "Password is required",
    "string.min":          "Password must be at least 8 characters",
    "string.pattern.base": "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
  });

export const genderOptional = trimmedString().valid(...genderOptions).optional().allow(null, "").messages({
  "any.only": "Gender must be one of: male, female, other",
});

export const genderRequired = trimmedString().valid(...genderOptions).required().messages({
  "any.only":     "Gender must be one of: male, female, other",
  "string.empty": "Gender is required",
  "any.required": "Gender is required",
});

// ─── User schemas ─────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  username:   usernameField,
  password:   passwordField(256),
  first_name: firstNameField,
  last_name:  lastNameField,
  phone:      phoneField,
  email:      emailField,
  gender:     genderOptional,
});

export const loginSchema = Joi.object({
  username: trimmedString().required().messages({ "string.empty": "Username is required" }),
  password: trimmedString().required().messages({ "string.empty": "Password is required" }),
});

export const updateProfileSchema = Joi.object({
  username:   usernameField,
  first_name: firstNameField,
  last_name:  lastNameField,
  phone:      phoneField,
  email:      emailField,
  gender:     genderOptional,
}).options({ allowUnknown: true });

export const resetPasswordSchema = Joi.object({
  token:       trimmedString().required().messages({ "string.empty": "Token is required" }),
  newPassword: passwordField(256),
});

export const changePasswordSchema = Joi.object({
  newPassword: passwordField(256),
  confirmPassword: trimmedString().required().valid(Joi.ref("newPassword")).messages({
    "any.only":    "Passwords do not match",
    "string.empty":"Please confirm your password",
    "any.required":"Please confirm your password",
  }),
});

// ─── Admin / Subadmin schemas (reused in admin routes) ────────────────────────

export const createSubadminSchema = Joi.object({
  username:   usernameField,
  password:   passwordField(256),
  first_name: firstNameField,
  last_name:  lastNameField,
  phone:      phoneField,
  email:      emailField,
  gender:     genderOptional,
  role_id: Joi.number().integer().positive().required().messages({
    "any.required": "Role is required",
    "number.base": "Role is required",
  }),
});

export const updateSubadminSchema = Joi.object({
  username:   usernameField,
  first_name: firstNameField,
  last_name:  lastNameField,
  phone:      phoneField,
  email:      emailField,
  gender:     genderRequired,
  role_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Invalid role",
  }),
});

export const adminUpdateUserStatusSchema = Joi.object({
  status: Joi.string().valid("active", "pending", "inactive").required().messages({
    "any.only":    "Status must be one of: active, pending, inactive",
    "string.empty":"Status is a required",
    // "any.required":"Status aa required",
  }),
});

export const adminUpdateUserProfileSchema = Joi.object({
  username:   usernameField,
  first_name: firstNameField,
  last_name:  lastNameField,
  phone:      phoneField,
  email:      emailField,
  gender:     genderRequired,

});

// ─── Bulk import (same user fields + sheet status + profile picture URL) ─────

export const bulkImportSheetStatusField = trimmedString()
  .valid("active", "pending", "inactive", "deleted")
  .required()
  .messages({
    "any.only": "Status must be one of: active, pending, inactive, deleted",
    "string.empty": "Status is required",
  });

const bulkImportRowSchema = Joi.object({
  username: usernameField,
  first_name: firstNameField,
  last_name: lastNameField,
  phone: phoneField,
  email: emailField,
  gender: genderRequired,
  sheet_status: bulkImportSheetStatusField,
  row_no: Joi.number().integer().required().messages({
    "number.base": "Row number must be a number",
    "any.required": "Row number is required",
  }),
profile_picture: trimmedString().optional().allow(""),
});

export const bulkImportSchema = Joi.object({
  rows: Joi.array().items(bulkImportRowSchema).min(1).required().messages({
    "array.min": "No data found in file",
    "any.required": "No data found in file",
  }),
});
