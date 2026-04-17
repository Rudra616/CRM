import Joi from "joi";

const usernameRegex = /^[A-Za-z0-9]+$/;
const nameRegex = /^[A-Za-z]+$/;
const phoneRegex = /^[0-9]+$/;
const genderOptions = ["male", "female", "other"] as const;

export const updateAdminSchema = Joi.object({
  username: Joi.string().min(3).max(50).pattern(usernameRegex).required().messages({
    "string.empty": "Username is required",
    "string.pattern.base": "Username must contain only letters and numbers",
  }),
  email: Joi.string().min(5).max(100).email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  first_name: Joi.string().min(1).max(50).pattern(nameRegex).optional().messages({
    "string.pattern.base": "First name must contain only letters",
  }),
  last_name: Joi.string()
    .min(1)
    .max(50)
    .pattern(nameRegex)
    .trim()
    .optional()
    .messages({
      "string.pattern.base": "Last name must contain only letters",
    }),
  phone: Joi.string().length(10).pattern(phoneRegex).optional().messages({
    "string.length": "Phone must be exactly 10 digits",
    "string.pattern.base": "Phone must contain only numbers",
  }),
  gender: Joi.string().valid(...genderOptions).optional().allow(null, "").messages({
    "any.only": "Gender must be one of: male, female, other",
  }),
});

export const createModuleSchema = Joi.object({
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
  permissions: Joi.array()
    .items(
      Joi.object({
        module_id: Joi.number().integer().positive().required(),
        can_view: Joi.boolean().optional().default(false),
        can_add: Joi.boolean().optional().default(false),
        can_edit: Joi.boolean().optional().default(false),
        can_delete: Joi.boolean().optional().default(false),
      })
    )
    .required()
    .messages({
      "array.base": "permissions must be an array",
      "any.required": "permissions is required",
    }),
});

