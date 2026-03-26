import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse, User, Admin } from '../../../shared/types/common.types';
import type { UpdateProfileRequest } from '../types/user.types';
import axiosClient from '../../../shared/api/axiosClient';

export const getProfileApi = (): Promise<ApiResponse<User>> => {
  return apiRequest<User>('GET', '/profile');
};

export const updateProfileApi = (
  data: UpdateProfileRequest
): Promise<ApiResponse<User>> => {
  return apiRequest<User>('PUT', '/profile', data);
};

export const updateProfileWithImageApi = async (
  data: UpdateProfileRequest & { newPassword?: string; confirmPassword?: string },
  imageFile?: File | null
): Promise<ApiResponse<User>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('firstname', data.firstname);
  formData.append('lastname', data.lastname);
  formData.append('email', data.email);
  formData.append('phone', data.phone);
  if (data.gender) formData.append('gender', data.gender);
  if (data.newPassword?.trim()) formData.append('newPassword', data.newPassword);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<User>>('/profile', formData);
  return res.data;
};

export const getAdminProfileApi = (): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('GET', '/admin/profile');
};

export const updateAdminProfileApi = (
  data: { username: string; email: string; password?: string }
): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('PUT', '/admin/profile', data);
};

export const updateAdminProfileWithImageApi = async (
  data: { username: string; email: string; password?: string },
  imageFile?: File | null
): Promise<ApiResponse<Admin>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('email', data.email);
  if (data.password?.trim()) formData.append('password', data.password);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<Admin>>('/admin/profile', formData);
  return res.data;
};