export type Gender = 'male' | 'female' | 'other';

/** End-user row (`user` table) — app state / forms. */
export interface User {
  id: string | number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  image_url?: string | null;
  gender?: Gender;
  status?: 'active' | 'pending' | 'inactive';
  /** Soft-deleted users (from `user.is_delete`) */
  is_delete?: 0 | 1;
  /** RBAC role id when applicable (some APIs attach it). */
  role_id?: number | null;
  role_name?: string;
}

/** Staff login payloads (subset). */
export interface Admin {
  id: number;
  username: string;
  email: string;
  role_id?: number | null;
  image_url?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Signed-in identity (browser session).
 * Use `role_id` for RBAC on delegated staff only (`admin.role_id`).
 */
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  /** Session is an `admin` table row (main or delegated staff). */
  is_staff: boolean;
  /** Reserved main administrator row — full bypass; never rename username in UI/API. */
  is_main_admin: boolean;
  /** RBAC role id (`admin.role_id`) when `is_staff` and not main admin. */
  role_id?: number | null;
}
