import Joi from "joi";

const nameRegex = /^[A-Za-z]+$/;
const usernameRegex = /^[A-Za-z0-9]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const DIGITS_10_REGEX = /^[0-9]+$/;
const genderOptions = ["male", "female", "other"] as const;

const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  PASSWORD_MIN: 8,
  PASSWORD_MAX_USER: 256,
  PASSWORD_MAX_ADMIN: 255,
  NAME_MIN: 1,
  NAME_MAX: 50,
  EMAIL_MIN: 5,
  EMAIL_MAX_USER: 50,
  EMAIL_MAX_ADMIN: 100,
  PHONE_LEN: 10,
};

const usernameField = Joi.string()
  .min(LIMITS.USERNAME_MIN)
  .max(LIMITS.USERNAME_MAX)
  .pattern(usernameRegex)
  .required()
  .messages({
    "string.empty": "Username is required",
    "string.min": `Username must be at least ${LIMITS.USERNAME_MIN} characters`,
    "string.max": `Username must be at most ${LIMITS.USERNAME_MAX} characters`,
    "string.pattern.base": "Username must contain only letters and numbers",
  });

const firstnameField = Joi.string()
  .min(LIMITS.NAME_MIN)
  .max(LIMITS.NAME_MAX)
  .pattern(nameRegex)
  .required()
  .messages({
    "string.min": "Firstname is required",
    "string.max": `Firstname must be at most ${LIMITS.NAME_MAX} characters`,
    "string.pattern.base": "Firstname must contain only letters",
    "string.empty": "Firstname is required",
  });

const lastnameField = Joi.string()
  .min(LIMITS.NAME_MIN)
  .max(LIMITS.NAME_MAX)
  .pattern(nameRegex)
  .required()
  .messages({
    "string.min": "Lastname is required",
    "string.max": `Lastname must be at most ${LIMITS.NAME_MAX} characters`,
    "string.pattern.base": "Lastname must contain only letters",
    "string.empty": "Lastname is required",
  });

const phoneField = Joi.string()
  .length(LIMITS.PHONE_LEN)
  .pattern(DIGITS_10_REGEX)
  .required()
  .messages({
    "string.length": `Phone must be exactly ${LIMITS.PHONE_LEN} digits`,
    "string.pattern.base": "Phone must contain only numbers",
  });

const emailUserField = Joi.string()
  .min(LIMITS.EMAIL_MIN)
  .max(LIMITS.EMAIL_MAX_USER)
  .email()
  .required()
  .messages({
    "string.min": "Email is too short",
    "string.max": `Email must be at most ${LIMITS.EMAIL_MAX_USER} characters`,
    "string.email": "Invalid email format",
    "string.empty": "Email is required",
  });

const genderOptional = Joi.string()
  .valid(...genderOptions)
  .optional()
  .messages({
    "any.only": `Gender must be one of: ${genderOptions.join(", ")}`,
  });

const genderRequired = Joi.string()
  .valid(...genderOptions)
  .required()
  .messages({
    "any.only": `Gender must be one of: ${genderOptions.join(", ")}`,
    "string.empty": "Gender is required",
    "any.required": "Gender is required",
  });

export const registerSchema = Joi.object({
  username: usernameField,
  password: Joi.string()
    .min(LIMITS.PASSWORD_MIN)
    .max(LIMITS.PASSWORD_MAX_USER)
    .pattern(passwordRegex)
    .required()
    .messages({
      "string.min": `Password must be at least ${LIMITS.PASSWORD_MIN} characters`,
      "string.max": `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters`,
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
      "string.empty": "Password is required",
    }),
  firstname: firstnameField,
  lastname: lastnameField,
  phone: phoneField,
  email: emailUserField,
  gender: genderOptional, 
});


export const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "string.empty": "Username is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

export const subadminSchema = registerSchema; 
export const updateUserSchema = Joi.object({
  username: usernameField,
  firstname: firstnameField,
  lastname: lastnameField,
  phone: phoneField,
  email: emailUserField,
  gender: genderRequired, 
  password: Joi.string()
    .allow("", null)
    .optional()
    .min(LIMITS.PASSWORD_MIN)
    .max(LIMITS.PASSWORD_MAX_USER)
    .pattern(passwordRegex)
    .messages({
      "string.min": `Password must be at least ${LIMITS.PASSWORD_MIN} characters`,
      "string.max": `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters`,
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
    }),
});

export const updateProfileSchema = Joi.object({
  username: usernameField,
  firstname: firstnameField,
  lastname: lastnameField,
  phone: phoneField,
  email: emailUserField,
  gender: genderOptional, 
  newPassword: Joi.string()
    .allow("", null)
    .optional()
    .min(LIMITS.PASSWORD_MIN)
    .max(LIMITS.PASSWORD_MAX_USER)
    .pattern(passwordRegex)
    .messages({
      "string.min": `Password must be at least ${LIMITS.PASSWORD_MIN} characters`,
      "string.max": `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters`,
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
    }),
}).options({ allowUnknown: true }); 

export const updateAdminSchema = Joi.object({
  username: usernameField,
  email: Joi.string()
    .min(LIMITS.EMAIL_MIN)
    .max(LIMITS.EMAIL_MAX_ADMIN)
    .email()
    .required()
    .messages({
      "string.min": "Email is too short",
      "string.max": `Email must be at most ${LIMITS.EMAIL_MAX_ADMIN} characters`,
      "string.email": "Invalid email format",
      "string.empty": "Email is required",
    }),
  password: Joi.string()
    .allow("", null)
    .optional()
    .min(LIMITS.PASSWORD_MIN)
    .max(LIMITS.PASSWORD_MAX_ADMIN)
    .pattern(passwordRegex)
    .messages({
      "string.min": `Password must be at least ${LIMITS.PASSWORD_MIN} characters`,
      "string.max": `Password must be at most ${LIMITS.PASSWORD_MAX_ADMIN} characters`,
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and symbol (@$!%*?&)",
    }),
}).options({ allowUnknown: true });