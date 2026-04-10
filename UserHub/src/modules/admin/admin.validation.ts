import Joi from "joi";

const usernameRegex = /^[A-Za-z0-9]+$/;
const nameRegex     = /^[A-Za-z]+$/;
const phoneRegex    = /^[0-9]+$/;
const genderOptions = ["male", "female", "other"] as const;

export const updateAdminSchema = Joi.object({
  username: Joi.string().min(3).max(50).pattern(usernameRegex).required().messages({
    "string.empty":        "Username is required",
    "string.pattern.base": "Username must contain only letters and numbers",
  }),
  email: Joi.string().min(5).max(100).email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  first_name: Joi.string().min(1).max(50).pattern(nameRegex).optional().messages({
    "string.pattern.base": "First name must contain only letters",
  }),
  last_name: Joi.string().min(1).max(50).pattern(nameRegex).optional().messages({
    "string.pattern.base": "Last name must contain only letters",
  }),
  phone: Joi.string().length(10).pattern(phoneRegex).optional().messages({
    "string.length":       "Phone must be exactly 10 digits",
    "string.pattern.base": "Phone must contain only numbers",
  }),
  gender: Joi.string().valid(...genderOptions).optional().allow(null, "").messages({
    "any.only": "Gender must be one of: male, female, other",
  }),
});

export const createModuleSchema = Joi.object({
  key: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Module key is required",
    "any.required": "Module key is required",
  }),
  name: Joi.string().min(2).max(150).required().messages({
    "string.empty": "Module name is required",
    "any.required": "Module name is required",
  }),
});

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Role name is required",
    "any.required": "Role name is required",
  }),
});

export const updateRolePermissionsSchema = Joi.object({
  moduleIds: Joi.array()
    .items(Joi.number().integer().positive())
    .sparse(false)
    .required()
    .messages({
      "array.base": "moduleIds must be an array",
      "array.includesRequiredUnknowns": "moduleIds contains invalid values",
      "array.sparse": "moduleIds contains empty values",
      "any.required": "moduleIds is required",
    }),
});
