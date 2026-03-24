
const nameRegex = /^[A-Za-z]+$/;
const usernameRegex = /^[A-Za-z0-9]+$/;
// const phoneRegex = /^[0-9]{10}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const DIGITS_10_REGEX = /^[0-9]{10}$/;

const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 50, // users/admin username
  PASSWORD_MIN: 8,
  PASSWORD_MAX_USER: 256, // users.password
  PASSWORD_MAX_ADMIN: 255, // admin.password
  NAME_MAX: 50, // users.firstname/lastname
  EMAIL_MAX_USER: 50, // users.email
  EMAIL_MAX_ADMIN: 100, // admin.email
  PHONE_LEN: 10, // users.phone
};

export type ValidationResult = { valid: boolean; message?: string };

export const validateLogin = (username: string, password: string): ValidationResult => {
  if (!username?.trim()) return { valid: false, message: "Username is required" };
  if (username.trim().length < LIMITS.USERNAME_MIN) return { valid: false, message: `Username must be at least ${LIMITS.USERNAME_MIN} characters` };
  if (username.trim().length > LIMITS.USERNAME_MAX) return { valid: false, message: `Username must be at most ${LIMITS.USERNAME_MAX} characters` };
  if (!password?.trim()) return { valid: false, message: "Password is required" };
  return { valid: true };
};

export const validateLoginFields = (
  username: string,
  password: string
): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {};
  if (!username?.trim()) results.username = { valid: false, message: "Username is required" };
  else if (username.trim().length < LIMITS.USERNAME_MIN)
    results.username = { valid: false, message: `Username must be at least ${LIMITS.USERNAME_MIN} characters` };
  else if (username.trim().length > LIMITS.USERNAME_MAX)
    results.username = { valid: false, message: `Username must be at most ${LIMITS.USERNAME_MAX} characters` };
  if (!password?.trim()) results.password = { valid: false, message: "Password is required" };
  return results;
};

export const validateRegister = (data: {
  username: string;
  password: string;
  confirmPassword: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: string; 
}): { [key: string]: ValidationResult } => {
  const { username, password, confirmPassword, firstname, lastname, email, phone, gender } = data;
  const errors: { [key: string]: ValidationResult } = {};

  if (!username?.trim()) errors.username = { valid: false, message: "Username is required" };
  else if (username.trim().length < LIMITS.USERNAME_MIN) errors.username = { valid: false, message: `Username must be at least ${LIMITS.USERNAME_MIN} characters` };
  else if (username.trim().length > LIMITS.USERNAME_MAX) errors.username = { valid: false, message: `Username must be at most ${LIMITS.USERNAME_MAX} characters` };
  else if (!usernameRegex.test(username.trim())) errors.username = { valid: false, message: "Username must contain only letters and numbers" };

  if (!firstname?.trim()) errors.firstname = { valid: false, message: "Firstname is required" };
  else if (firstname.trim().length > LIMITS.NAME_MAX) errors.firstname = { valid: false, message: `Firstname must be at most ${LIMITS.NAME_MAX} characters` };
  else if (!nameRegex.test(firstname.trim())) errors.firstname = { valid: false, message: "Firstname must contain only letters" };

  if (!lastname?.trim()) errors.lastname = { valid: false, message: "Lastname is required" };
  else if (lastname.trim().length > LIMITS.NAME_MAX) errors.lastname = { valid: false, message: `Lastname must be at most ${LIMITS.NAME_MAX} characters` };
  else if (!nameRegex.test(lastname.trim())) errors.lastname = { valid: false, message: "Lastname must contain only letters" };

  if (!email?.trim()) errors.email = { valid: false, message: "Email is required" };
  else if (email.trim().length > LIMITS.EMAIL_MAX_USER) errors.email = { valid: false, message: `Email must be at most ${LIMITS.EMAIL_MAX_USER} characters` };
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = { valid: false, message: "Invalid email format" };

  if (!phone?.trim()) errors.phone = { valid: false, message: "Phone is required" };
  else if (!DIGITS_10_REGEX.test(phone.replace(/\D/g, ""))) errors.phone = { valid: false, message: `Phone must be exactly ${LIMITS.PHONE_LEN} digits` };
  if (!gender?.trim()) {
    errors.gender = { valid: false, message: "Gender is required" };
  } else if (!["male", "female", "other"].includes(gender)) {
    errors.gender = { valid: false, message: "Invalid gender selection" };
  }
  if (!password?.trim()) errors.password = { valid: false, message: "Password is required" };
  else if (password.length > LIMITS.PASSWORD_MAX_USER) errors.password = { valid: false, message: `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters` };
  else if (!passwordRegex.test(password)) errors.password = {
    valid: false, message: `Password must contain uppercase, lowercase, number and symbol (@$!%*?&) and be at least ${LIMITS.PASSWORD_MIN} characters`
  };

  if (password !== confirmPassword) errors.confirmPassword = { valid: false, message: "Passwords do not match" };

  return errors;
};

export const validateProfile = (data: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}): ValidationResult => {
  const fields = validateProfileFields(data);
  const first = Object.values(fields).find((r) => !r.valid);
  return first ?? { valid: true };
};

export const validateProfileFields = (data: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  newPassword?: string;
    confirmPassword?: string; 

  gender?: string;
}): Record<string, ValidationResult> => {
  const { username, firstname, lastname, email, phone, gender, newPassword,confirmPassword } = data;
  const errors: Record<string, ValidationResult> = {};

  if (!username?.trim()) errors.username = { valid: false, message: "Username is required" };
  else if (username.trim().length < LIMITS.USERNAME_MIN) errors.username = { valid: false, message: `Username must be at least ${LIMITS.USERNAME_MIN} characters` };
  else if (username.trim().length > LIMITS.USERNAME_MAX) errors.username = { valid: false, message: `Username must be at most ${LIMITS.USERNAME_MAX} characters` };
  else if (!usernameRegex.test(username.trim())) errors.username = { valid: false, message: "Username must contain only letters and numbers" };

  if (!firstname?.trim()) errors.firstname = { valid: false, message: "Firstname is required" };
  else if (firstname.trim().length > LIMITS.NAME_MAX) errors.firstname = { valid: false, message: `Firstname must be at most ${LIMITS.NAME_MAX} characters` };
  else if (!nameRegex.test(firstname.trim())) errors.firstname = { valid: false, message: "Firstname must contain only letters" };

  if (!lastname?.trim()) errors.lastname = { valid: false, message: "Lastname is required" };
  else if (lastname.trim().length > LIMITS.NAME_MAX) errors.lastname = { valid: false, message: `Lastname must be at most ${LIMITS.NAME_MAX} characters` };
  else if (!nameRegex.test(lastname.trim())) errors.lastname = { valid: false, message: "Lastname must contain only letters" };

  if (!email?.trim()) errors.email = { valid: false, message: "Email is required" };
  else if (email.trim().length > LIMITS.EMAIL_MAX_USER) errors.email = { valid: false, message: `Email must be at most ${LIMITS.EMAIL_MAX_USER} characters` };
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = { valid: false, message: "Invalid email format" };

  if (!phone?.trim()) errors.phone = { valid: false, message: "Phone is required" };
  else if (!DIGITS_10_REGEX.test(phone.replace(/\D/g, ""))) errors.phone = { valid: false, message: `Phone must be exactly ${LIMITS.PHONE_LEN} digits` };
  if (!gender?.trim()) {
    errors.gender = { valid: false, message: "Gender is required" };
  } else if (!["male", "female", "other"].includes(gender)) {
    errors.gender = { valid: false, message: "Invalid gender selection" };
  }
  if (newPassword && newPassword.trim().length > 0 && newPassword.length > LIMITS.PASSWORD_MAX_USER) {
    errors.newPassword = { valid: false, message: `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters` };
  } else if (newPassword && newPassword.trim().length > 0 && !passwordRegex.test(newPassword)) {
    errors.newPassword = { valid: false, message: `Password must contain uppercase, lowercase, number and symbol (@$!%*?&) and be at least ${LIMITS.PASSWORD_MIN} characters` };
  }
    if (newPassword && newPassword.trim().length > 0) {
    if (!confirmPassword || confirmPassword.trim().length === 0) {
      errors.confirmPassword = {
        valid: false,
        message: "Confirm password is required",
      };
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = {
        valid: false,
        message: "Passwords do not match",
      };
    }
  }

  return errors;
};

export const validateAdminProfile = (data: {
  username: string;
  email: string;
  password?: string;
}): ValidationResult => {
  const fields = validateAdminProfileFields(data);
  const first = Object.values(fields).find((r) => !r.valid);
  return first ?? { valid: true };
};

/** Per-field validation for admin profile */
export const validateAdminProfileFields = (data: {
  username: string;
  email: string;
  password?: string;
}): Record<string, ValidationResult> => {
  const { username, email, password } = data;
  const errors: Record<string, ValidationResult> = {};

  if (!username?.trim()) errors.username = { valid: false, message: "Username is required" };
  else if (username.trim().length < LIMITS.USERNAME_MIN) errors.username = { valid: false, message: `Username must be at least ${LIMITS.USERNAME_MIN} characters` };
  else if (username.trim().length > LIMITS.USERNAME_MAX) errors.username = { valid: false, message: `Username must be at most ${LIMITS.USERNAME_MAX} characters` };
  else if (!usernameRegex.test(username.trim())) errors.username = { valid: false, message: "Username must contain only letters and numbers" };

  if (!email?.trim()) errors.email = { valid: false, message: "Email is required" };
  else if (email.trim().length > LIMITS.EMAIL_MAX_ADMIN) errors.email = { valid: false, message: `Email must be at most ${LIMITS.EMAIL_MAX_ADMIN} characters` };
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = { valid: false, message: "Invalid email format" };

  if (password && password.trim().length > 0 && password.length > LIMITS.PASSWORD_MAX_ADMIN) {
    errors.password = { valid: false, message: `Password must be at most ${LIMITS.PASSWORD_MAX_ADMIN} characters` };
  } else if (password && password.trim().length > 0 && !passwordRegex.test(password)) {
    errors.password = { valid: false, message: `Password must contain uppercase, lowercase, number and symbol (@$!%*?&) and be at least ${LIMITS.PASSWORD_MIN} characters` };
  }
  return errors;
};

export const validateEditUser = (data: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password?: string;
}): ValidationResult => {
  const fields = validateEditUserFields(data);
  const first = Object.values(fields).find((r) => !r.valid);
  return first ?? { valid: true };
};

export const validateEditUserFields = (data: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password?: string;
  gender?: string
}): Record<string, ValidationResult> => {
  const base = validateProfileFields({
    username: data.username,
    firstname: data.firstname,
    lastname: data.lastname,
    email: data.email,
    phone: data.phone,
    gender: data.gender ?? "",
  });
  if (data.password && data.password.trim().length > 0 && !passwordRegex.test(data.password)) {
    if (data.password.length > LIMITS.PASSWORD_MAX_USER) {
      base.password = { valid: false, message: `Password must be at most ${LIMITS.PASSWORD_MAX_USER} characters` };
    } else {
      base.password = { valid: false, message: `Password must contain uppercase, lowercase, number and symbol (@$!%*?&) and be at least ${LIMITS.PASSWORD_MIN} characters` };
    }
  }
  return base;
};