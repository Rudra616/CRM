export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export type Gender = "male" | "female" | "other";

export interface User {
  id: string | number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  role: "admin" | "subadmin" | "user";
  image_url?: string | null;
  gender?: Gender;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  role: "admin";
  image_url?: string | null;
  // no gender — admin table has no gender column
}

export interface AdminLoginResponse {
  token: string;
  admin: Admin;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  phone: string;
  gender?: Gender; // ✅ added
}

export type CreateSubadminRequest = RegisterRequest;

export interface UpdateProfileRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  newPassword?: string;
  gender?: Gender; // ✅ added
}

export interface UpdateUserRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password?: string;
  gender: Gender; // ✅ required (admin must set it)
}

export interface UpdateAdminRequest {
  username: string;
  email: string;
  password?: string;
}