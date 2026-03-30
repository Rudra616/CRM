import Joi from "joi";

// ─── Reusable field definitions ───────────────────────────────────────────────

const nameRegex      = /^[A-Za-z]+$/;
const usernameRegex  = /^[A-Za-z0-9]+$/;
const passwordRegex  = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const phoneRegex     = /^[0-9]+$/;
const genderOptions  = ["male", "female", "other"] as const;

const usernameField = Joi.string().min(3).max(50).pattern(usernameRegex).required().messages({
  "string.empty":        "Username is required",
  "string.min":          "Username must be at least 3 characters",
  "string.max":          "Username must be at most 50 characters",
  "string.pattern.base": "Username must contain only letters and numbers",
});

const firstnameField = Joi.string().min(1).max(50).pattern(nameRegex).required().messages({
  "string.empty":        "Firstname is required",
  "string.min":          "Firstname is required",
  "string.max":          "Firstname must be at most 50 characters",
  "string.pattern.base": "Firstname must contain only letters",
});

const lastnameField = Joi.string().min(1).max(50).pattern(nameRegex).required().messages({
  "string.empty":        "Lastname is required",
  "string.min":          "Lastname is required",
  "string.max":          "Lastname must be at most 50 characters",
  "string.pattern.base": "Lastname must contain only letters",
});

const phoneField = Joi.string().length(10).pattern(phoneRegex).required().messages({
  "string.length":       "Phone must be exactly 10 digits",
  "string.pattern.base": "Phone must contain only numbers",
});

const emailField = Joi.string().min(5).max(50).email().required().messages({
  "string.empty": "Email is required",
  "string.min":   "Email is too short",
  "string.max":   "Email must be at most 50 characters",
  "string.email": "Invalid email format",
});

const passwordField = (maxLen = 256) =>
  Joi.string().min(8).max(maxLen).pattern(passwordRegex).required().messages({
    "string.empty":        "Password is required",
    "string.min":          "Password must be at least 8 characters",
    "string.max":          `Password must be at most ${maxLen} characters`,
    "string.pattern.base": "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
  });

const optionalPasswordField = (maxLen = 256) =>
  Joi.string().allow("", null).optional().min(8).max(maxLen).pattern(passwordRegex).messages({
    "string.min":          "Password must be at least 8 characters",
    "string.max":          `Password must be at most ${maxLen} characters`,
    "string.pattern.base": "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
  });

const genderOptional = Joi.string().valid(...genderOptions).optional().messages({
  "any.only": "Gender must be one of: male, female, other",
});

const genderRequired = Joi.string().valid(...genderOptions).required().messages({
  "any.only":    "Gender must be one of: male, female, other",
  "string.empty":"Gender is required",
  "any.required":"Gender is required",
});

// ─── Exported schemas ─────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  username:  usernameField,
  password:  passwordField(256),
  firstname: firstnameField,
  lastname:  lastnameField,
  phone:     phoneField,
  email:     emailField,
  gender:    genderOptional,
});

export const loginSchema = Joi.object({
  username: Joi.string().required().messages({ "string.empty": "Username is required" }),
  password: Joi.string().required().messages({ "string.empty": "Password is required" }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Token is required",
  }),
  newPassword: passwordField(256),
});

// Subadmin uses the same rules as register
export const subadminSchema = registerSchema;

export const updateUserSchema = Joi.object({
  username:  usernameField,
  firstname: firstnameField,
  lastname:  lastnameField,
  phone:     phoneField,
  email:     emailField,
  gender:    genderRequired,
  password:  optionalPasswordField(256),
});

/** Subadmin profile update (no password — use POST .../change-password). */
export const updateSubadminProfileSchema = Joi.object({
  username:  usernameField,
  firstname: firstnameField,
  lastname:  lastnameField,
  phone:     phoneField,
  email:     emailField,
  gender:    genderRequired,
});

export const updateProfileSchema = Joi.object({
  username:    usernameField,
  firstname:   firstnameField,
  lastname:    lastnameField,
  phone:       phoneField,
  email:       emailField,
  gender:      genderOptional,
}).options({ allowUnknown: true });

export const changePasswordSchema = Joi.object({
  newPassword: passwordField(256),
  confirmPassword: Joi.string().required().valid(Joi.ref("newPassword")).messages({
    "any.only": "Passwords do not match",
    "string.empty": "Please confirm your password",
    "any.required": "Please confirm your password",
  }),
});