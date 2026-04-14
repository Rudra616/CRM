import { apiRequest } from '../../../shared/api/apiWrapper';
import type {
  LoginResponse,
  AdminLoginResponse,
  SubadminLoginResponse,
  ApiResponse,
  RegisterRequest,
  CreateSubadminRequest,
} from '../types/auth.types';

export const loginApi = (
  username: string,
  password: string
): Promise<ApiResponse<LoginResponse>> => {
  return apiRequest<LoginResponse>('POST', '/login', { username, password });
};

export const adminLoginApi = (
  username: string,
  password: string
): Promise<ApiResponse<AdminLoginResponse>> => {
  return apiRequest<AdminLoginResponse>('POST', '/admin/login', { username, password });
};

export const subadminLoginApi = (
  username: string,
  password: string
): Promise<ApiResponse<SubadminLoginResponse>> => {
  return apiRequest<SubadminLoginResponse>('POST', '/subadmin/login', { username, password });
};

export const logoutApi = (): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/logout');
};

export const logoutAdminApi = (): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/admin/logout');
};

export const logoutSubadminApi = (): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/subadmin/logout');
};

export const registerApi = (
  data: RegisterRequest
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/register', {
    username: data.username,
    email: data.email,
    password: data.password,
    first_name: data.firstname,
    last_name: data.lastname,
    phone: data.phone,
    gender: data.gender,
  });
};

export const createSubadminApi = (
  data: CreateSubadminRequest
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/admin/subadmins', {
    username: data.username,
    email: data.email,
    password: data.password,
    first_name: data.firstname,
    last_name: data.lastname,
    phone: data.phone,
    gender: data.gender,
    role_id: data.role_id,
  });
};

export const forgotPasswordApi = (email: string) =>
  apiRequest<null>('POST', '/forgot-password', { email });

export const resetPasswordApi = (token: string, newPassword: string) =>
  apiRequest<null>('POST', '/reset-password', { token, newPassword });

export const verifyResetTokenApi = (token: string) =>
  apiRequest<null>('POST', '/verify-reset-token', { token });