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
  return apiRequest<User>('PUT', '/profile', {
    username: data.username,
    first_name: data.firstname,
    last_name: data.lastname,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
  });
};

export const updateProfileWithImageApi = async (
  data: UpdateProfileRequest,
  imageFile?: File | null
): Promise<ApiResponse<User>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('first_name', data.firstname);
  formData.append('last_name', data.lastname);
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

export const getSubadminProfileApi = (): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('GET', '/subadmin/profile');
};

export const updateSubadminProfileWithImageApi = async (
  data: { username: string; email: string },
  imageFile?: File | null
): Promise<ApiResponse<Admin>> => {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('email', data.email);
  if (imageFile) formData.append('image', imageFile);
  const res = await axiosClient.put<ApiResponse<Admin>>('/subadmin/profile', formData);
  return res.data;
};

export const changeSubadminPasswordApi = (body: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/subadmin/change-password', body);
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
