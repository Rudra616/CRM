import { User, Admin } from '../../../shared/types/common.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginResponse {
  token: string;
  user: User;
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
  gender?: string;
}

export type CreateSubadminRequest = RegisterRequest;