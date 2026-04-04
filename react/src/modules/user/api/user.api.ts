import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse, User, Admin } from '../../../shared/types/common.types';
import type { UpdateProfileRequest } from '../types/user.types';
import axiosClient from '../../../shared/api/axiosClient';

export const getProfileApi = (): Promise<ApiResponse<User>> => {
  return apiRequest<User>('GET', '/profile');
};

/** Validates cookie + token row + user status; 401 triggers global logout redirect. */
export const pingSessionApi = (): Promise<ApiResponse<{ ok: boolean }>> => {
  return apiRequest<{ ok: boolean }>('GET', '/session/ping');
};

export const updateProfileApi = (
  data: UpdateProfileRequest
): Promise<ApiResponse<User>> => {
  return apiRequest<User>('PUT', '/profile', data);
};

export const updateProfileWithImageApi = async (
  data: UpdateProfileRequest,
  imageFile?: File | null
): Promise<ApiResponse<User>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('firstname', data.firstname);
  formData.append('lastname', data.lastname);
  formData.append('email', data.email);
  formData.append('phone', data.phone);
  if (data.gender) formData.append('gender', data.gender);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<User>>('/profile', formData);
  return res.data;
};

export const changeUserPasswordApi = (body: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/change-password', body);
};

export const getAdminProfileApi = (): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('GET', '/admin/profile');
};

export const updateAdminProfileApi = (
  data: { username: string; email: string }
): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('PUT', '/admin/profile', data);
};

export const updateAdminProfileWithImageApi = async (
  data: { username: string; email: string },
  imageFile?: File | null
): Promise<ApiResponse<Admin>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('email', data.email);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<Admin>>('/admin/profile', formData);
  return res.data;
};
