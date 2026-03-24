import axiosClient from "./axiosClient";
import { apiRequest } from "./apiWrapper";
import type {
  LoginResponse,
  AdminLoginResponse,
  ApiResponse,
  RegisterRequest,
  CreateSubadminRequest,
  User,
  Admin,
  UpdateProfileRequest,
  UpdateUserRequest,
  UpdateAdminRequest,
} from "../types/apiTypes";

export const loginApi = (
  username: string,
  password: string
): Promise<ApiResponse<LoginResponse>> => {
  return apiRequest<LoginResponse>("POST", "/login", { username, password });
};

export const logoutApi = (): Promise<ApiResponse<null>> => {
  return apiRequest<null>("POST", "/logout");
};

export const logoutAdminApi = (): Promise<ApiResponse<null>> => {
  return apiRequest<null>("POST", "/admin/logout");
};

export const registerApi = (
  data: RegisterRequest
): Promise<ApiResponse<LoginResponse>> => {
  return apiRequest<LoginResponse>("POST", "/register", data); // gender included via data
};

export const createSubadminApi = (
  data: CreateSubadminRequest
): Promise<ApiResponse<null>> => {
  return apiRequest<null>("POST", "/admin/create-subadmin", data); // gender included via data
};

export const getUsersApi = (): Promise<ApiResponse<User[]>> => {
  return apiRequest<User[]>("GET", "/users");
};

export const getSubadminsApi = (): Promise<ApiResponse<User[]>> => {
  return apiRequest<User[]>("GET", "/admin/subadmins");
};

export const getProfileApi = (): Promise<ApiResponse<User>> => {
  return apiRequest<User>("GET", "/profile");
};

export const updateProfileApi = (
  data: UpdateProfileRequest
): Promise<ApiResponse<User>> => {
  return apiRequest<User>("PUT", "/profile", data);
};

/** Update profile with optional image (multipart/form-data) */
export const updateProfileWithImageApi = async (
  data: UpdateProfileRequest & { newPassword?: string },
  imageFile?: File | null
): Promise<ApiResponse<User>> => {
  const formData = new FormData();
  formData.append("username",  data.username);
  formData.append("firstname", data.firstname);
  formData.append("lastname",  data.lastname);
  formData.append("email",     data.email);
  formData.append("phone",     data.phone);
  if (data.gender)              formData.append("gender",      data.gender);       // ✅ added
  if (data.newPassword?.trim()) formData.append("newPassword", data.newPassword);
  if (imageFile)                formData.append("image",       imageFile);
  const res = await axiosClient.put<ApiResponse<User>>("/profile", formData);
  return res.data;
};

export const getAdminProfileApi = (): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>("GET", "/admin/profile");
};

export const updateAdminProfileApi = (
  data: UpdateAdminRequest
): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>("PUT", "/admin/profile", data);
};

/** Update admin profile with optional image (multipart/form-data) */
export const updateAdminProfileWithImageApi = async (
  data: UpdateAdminRequest,
  imageFile?: File | null
): Promise<ApiResponse<Admin>> => {
  const formData = new FormData();
  formData.append("username", data.username);
  formData.append("email",    data.email);
  if (data.password?.trim()) formData.append("password", data.password);
  if (imageFile)             formData.append("image",    imageFile);
  const res = await axiosClient.put<ApiResponse<Admin>>("/admin/profile", formData);
  return res.data;
};

export const updateSubadminApi = (
  id: string | number,
  data: UpdateUserRequest      // gender is required in UpdateUserRequest
): Promise<ApiResponse<User>> => {
  return apiRequest<User>("PUT", `/admin/subadmins/${id}`, data); // gender included via data
};

export const deleteSubadminApi = (
  id: string | number
): Promise<ApiResponse<null>> => {
  return apiRequest<null>("DELETE", `/admin/subadmins/${id}`);
};

export const adminLoginApi = (
  username: string,
  password: string
): Promise<ApiResponse<AdminLoginResponse>> => {
  return apiRequest<AdminLoginResponse>("POST", "/admin/login", { username, password });
};


export const forgotPasswordApi = (email: string) =>
  apiRequest<null>("POST", "/forgot-password", { email });

export const resetPasswordApi = (token: string, newPassword: string) =>
  apiRequest<null>("POST", "/reset-password", { token, newPassword });