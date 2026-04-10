import type { User, Admin } from '../../../shared/types/common.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginResponse {
  user: User;
}

export interface AdminLoginResponse {
  admin: Admin;
}

/** Subadmin login returns `subadmin` (not `admin`). See UserHub subadmin.self.controller. */
export interface SubadminLoginResponse {
  subadmin: {
    id: number;
    username: string;
    email: string;
    role: 'subadmin';
    first_name?: string;
    last_name?: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  phone: string;
  gender?: string;
}

export type CreateSubadminRequest = RegisterRequest;