import db from "../config/db";
import bcrypt from "bcrypt";
import { Role } from "../types/role";
import { RegisterUserDTO, User,UpdateProfileDTO,UpdateAdminDTO } from "../types/user";

// REGISTER USER
export const registerUserService = async (data: RegisterUserDTO): Promise<User> => {
  try {
    const { username, password, firstname, lastname, phone, email, gender } = data;
    const [existing]: any = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
 
    if (existing.length > 0) {
      throw new Error("Username or email already exists");
    }
 
    const hash = await bcrypt.hash(password, 10);
 
    const [result]: any = await db.query(
      "INSERT INTO users (username,password,firstname,lastname,phone,email,role_id,gender) VALUES (?,?,?,?,?,?,?,?)",
      [username, hash, firstname, lastname, phone, email, 3, gender]
    );
 
    return {
      id: result.insertId,
      username,
      password: hash,
      firstname,
      lastname,
      email,
      role_id: 3,
      gender,  // ✅ included in returned object
    } as User;
 
  } catch (err: any) {
    console.error("registerUserService error:", err.message);
    throw new Error(err.message || "Failed to register user");
  }
};


// LOGIN
export const loginService = async (username: string): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, password, firstname, lastname, email, role_id, gender
       FROM users
       WHERE username = ?`,
      [username]
    );
 
    if (rows.length === 0) return null;
 
    return rows[0] as User;
  } catch (err: any) {
    console.error("loginService error:", err.message);
    throw new Error("Login failed");
  }
};
 

// CREATE SUBADMIN
export const createSubadminService = async (data: RegisterUserDTO): Promise<void> => {
  try {
    const { username, email, password, firstname, lastname, phone, gender } = data;
 
    const [existing]: any = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
 
    if (existing.length > 0) {
      throw new Error("Username or email already exists");
    }
 
    const hash = await bcrypt.hash(password, 10);
 
    await db.query(
      "INSERT INTO users (username,password,firstname,lastname,phone,email,role_id,gender) VALUES (?,?,?,?,?,?,?,?)",
      [username, hash, firstname, lastname, phone, email, 2, gender] // 2 = subadmin
    );
  } catch (err: any) {
    console.error("createSubadminService error:", err.message);
    throw new Error(err.message || "Failed to create subadmin");
  }
};

// GET USERS
export const getUsersService = async (): Promise<User[]> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, firstname, lastname, phone, email,gender FROM users WHERE role_id = ?",
      [3] // 3 = user
    );
    return rows as User[];
  } catch (err: any) {
    console.error("getUsersService error:", err.message);
    throw new Error("Failed to fetch users");
  }
};


// GET SUBADMINS
export const getSubadminsService = async (): Promise<User[]> => {
  try {
    const [rows]: any = await db.query(
"SELECT id, username, firstname, lastname, phone, email, gender FROM users WHERE role_id = ?",
      [2] // 2 = subadmin
    );
    return rows as User[];
  } catch (err: any) {
    console.error("getSubadminsService error:", err.message);
    throw new Error("Failed to fetch subadmins");
  }
};
 


// GET PROFILE
export const getProfileService = async (userId: number): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, firstname, lastname, phone, email, role_id, image_url, gender FROM users WHERE id = ?",
      [userId]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  } catch (err: any) {
    console.error("getProfileService error:", err.message);
    throw new Error("Failed to fetch profile");
  }
};



// GET USER BY ID (for update)
export const getUserByIdService = async (id: number, roleId: number): Promise<User | null> => {
  try {
    const [rows]: any = await db.query(
"SELECT id, username, firstname, lastname, phone, email, gender FROM users WHERE id = ? AND role_id = ?",
      [id, roleId]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  } catch (err: any) {
    console.error("getUserByIdService error:", err.message);
    throw new Error("Failed to fetch user");
  }
};
 


// UPDATE SUBADMIN (admin only) - password optional
export const updateSubadminService = async (
  id: number,
  data: {
    username: string;
    firstname: string;
    lastname: string;
    phone: string;
    email: string;
    password?: string;
    gender: "male" | "female" | "other";
  }
): Promise<User | null> => {
  try {
    const roleId = 2;
    const existing = await getUserByIdService(id, roleId);
    if (!existing) return null;
 
    const { username, firstname, lastname, phone, email, password, gender } = data;
 
    const [dup]: any = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, id]
    );
    if (dup.length > 0) throw new Error("Username or email already exists");
 
    if (password && password.trim().length > 0) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE users
         SET username=?, firstname=?, lastname=?, phone=?, email=?, password=?, gender=?
         WHERE id=? AND role_id=?`,
        [username, firstname, lastname, phone, email, hash, gender, id, roleId]
      );
    } else {
      await db.query(
        `UPDATE users
         SET username=?, firstname=?, lastname=?, phone=?, email=?, gender=?
         WHERE id=? AND role_id=?`,
        [username, firstname, lastname, phone, email, gender, id, roleId]
      );
    }
 
    return getUserByIdService(id, roleId);
  } catch (err: any) {
    console.error("updateSubadminService error:", err.message);
    throw new Error(err.message || "Failed to update subadmin");
  }
};


// DELETE SUBADMIN
export const deleteSubadminService = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await db.query(
      "DELETE FROM users WHERE id = ? AND role_id = ?",
      [id, 2] // 2 = subadmin
    );
    return result.affectedRows > 0;
  } catch (err: any) {
    console.error("deleteSubadminService error:", err.message);
    throw new Error("Failed to delete subadmin");
  }
};


/** Update user profile - returns updated user for role-based consistency */

export const updateProfileService = async (
  userId: number,
  data: UpdateProfileDTO
): Promise<User | null> => {
  try {
    const { username, firstname, lastname, phone, email, newPassword, image_url, gender } = data;
 
    const [dup]: any = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, userId]
    );
    if (dup.length > 0) throw new Error("Username or email already exists");
 
    if (newPassword && newPassword.trim().length > 0) {
      const hash = await bcrypt.hash(newPassword, 10);
      await db.query(
        `UPDATE users SET username=?, firstname=?, lastname=?, phone=?, email=?, password=?, image_url=?, gender=? WHERE id=?`,
        [username, firstname, lastname, phone, email, hash, image_url, gender, userId]
      );
    } else {
      await db.query(
        `UPDATE users SET username=?, firstname=?, lastname=?, phone=?, email=?, image_url=?, gender=? WHERE id=?`,
        [username, firstname, lastname, phone, email, image_url, gender, userId]
      );
    }
 
    return getProfileService(userId);
  } catch (err: any) {
    console.error("updateProfileService error:", err.message);
    throw new Error("Failed to update profile");
  }
};

// LOGIN ADMIN
export const loginAdminService = async (username: string, password: string) => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM admin WHERE username = ?",
      [username]
    );
    if (rows.length === 0) return null;

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return null;

    return admin;
  } catch (err: any) {
    console.error("loginAdminService error:", err.message);
    throw new Error("Failed to login admin");
  }
};

// STORE USER TOKEN
export const storeUserTokenService = async (userId: number, username: string, roleId: number, token: string) => {
  try {
    const [existing]: any = await db.query(
      "SELECT id, expires_at FROM user_tokens WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE user_tokens SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE user_id=?`,
        [token, userId]
      );
    } else {
      await db.query(
        `INSERT INTO user_tokens (user_id, username, role_id, token, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())`,
        [userId, username, roleId, token]
      );
    }
  } catch (err: any) {
    console.error("storeUserTokenService error:", err.message);
    throw new Error("Failed to store user token");
  }
};

// STORE ADMIN TOKEN
export const storeAdminTokenService = async (adminId: number, username: string, token: string) => {
  try {
    const [existing]: any = await db.query(
      "SELECT id, expires_at FROM admin_tokens WHERE admin_id = ?",
      [adminId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE admin_tokens SET token=?, expires_at=DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at=NOW() WHERE admin_id=?`,
        [token, adminId]
      );
    } else {
      await db.query(
        `INSERT INTO admin_tokens (admin_id, username, role_id, token, expires_at, created_at, updated_at)
         VALUES (?, ?, 1, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW())`,
        [adminId, username, token]
      );
    }
  } catch (err: any) {
    console.error("storeAdminTokenService error:", err.message);
    throw new Error("Failed to store admin token");
  }
};

// LOGOUT USER - remove token from user_tokens
export const logoutUserService = async (token: string) => {
  try {
    await db.query("DELETE FROM user_tokens WHERE token = ?", [token]);
  } catch (err: any) {
    console.error("logoutUserService error:", err.message);
    throw new Error("Failed to logout user");
  }
};

// LOGOUT ADMIN - remove token from admin_tokens
export const logoutAdminService = async (token: string) => {
  try {
    await db.query("DELETE FROM admin_tokens WHERE token = ?", [token]);
  } catch (err: any) {
    console.error("logoutAdminService error:", err.message);
    throw new Error("Failed to logout admin");
  }
};

// GET ADMIN PROFILE
export const getAdminProfileService = async (adminId: number) => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, username, email, image_url FROM admin WHERE id = ?",
      [adminId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (err: any) {
    console.error("getAdminProfileService error:", err.message);
    throw new Error("Failed to fetch admin profile");
  }
};

// UPDATE ADMIN PROFILE
export const updateAdminProfileService = async (adminId: number, data: UpdateAdminDTO) => {
  try {
    const { username, email, password, image_url } = data;

    const [dup]: any = await db.query(
      "SELECT id FROM admin WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, adminId]
    );
    if (dup.length > 0) throw new Error("Username or email already exists");

    if (password && password.trim().length > 0) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE admin SET username=?, email=?, password=?, image_url=? WHERE id=?`,
        [username, email, hash, image_url ?? null, adminId]
      );
    } else {
      await db.query(
        `UPDATE admin SET username=?, email=?, image_url=? WHERE id=?`,
        [username, email, image_url ?? null, adminId]
      );
    }

    return getAdminProfileService(adminId);
  } catch (err: any) {
    console.error("updateAdminProfileService error:", err.message);
    throw new Error(err.message || "Failed to update admin profile");
  }
};