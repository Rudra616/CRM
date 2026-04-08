import { AdminRole } from "./role";

// ─── User (plain users, no role) ──────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other" | null;
  image_url?: string | null;
  status: "active" | "pending" | "inactive" | "delete";
  created_at?: Date;
  updated_at?: Date;
}

// ─── Admin (admin + subadmin) ─────────────────────────────────────────────────
export interface Admin {
  id: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other" | null;
  image_url?: string | null;
  role: AdminRole;
  status: "active" | "inactive";
  created_at?: Date;
  updated_at?: Date;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface RegisterUserDTO {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other";
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface UpdateUserProfileDTO {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other" | null;
  image_url?: string | null;
}

export interface CreateSubadminDTO {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other";
}

export interface UpdateSubadminDTO {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other" | null;
}

export interface UpdateAdminProfileDTO {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  gender?: "male" | "female" | "other" | null;
  image_url?: string | null;
}
