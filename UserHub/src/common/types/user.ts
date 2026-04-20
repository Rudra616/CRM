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
  status: "active" | "pending" | "inactive";
  is_delete?: 0 | 1;
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
  role_id?: number | null;
  role_name?: string | null;
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
  role_id: number;
}

export interface UpdateSubadminDTO {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other" | null;
  role_id?: number;
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




export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  image_url?: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at?: Date;
  updated_at?: Date;
}



// ─── Ticket Message ────────────────────────────────────────────────────────
export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_type: "user" | "admin";
  message: string;
  created_at?: Date;
}