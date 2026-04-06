import { apiRequest } from '../../../shared/api/apiWrapper';
import type { ApiResponse, User, Admin } from '../../../shared/types/common.types';
import type { UpdateUserRequest, UpdateAdminRequest } from '../types/admin.types';

export type UsersPageData = {
  items: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminDashboardSummary = {
  userCount: number;
  subadminCount: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  deletedUsers: number;
};
export const getUsersApi = (
  page: number,
  limit: number,
  statusFilter?: string
): Promise<ApiResponse<UsersPageData>> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

return apiRequest<UsersPageData>('GET', `/users?${params.toString()}`);
};

export const getAdminUsersApi = (
  page: number,
  limit: number,
  statusFilter?: string
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

  return apiRequest('GET', `/admin/users?${params.toString()}`);
};

export const getAdminDashboardSummaryApi = (): Promise<ApiResponse<AdminDashboardSummary>> => {
  return apiRequest<AdminDashboardSummary>(
    'GET',
    '/admin/dashboard-summary'
  );
};

export const getSubadminsApi = (): Promise<ApiResponse<User[]>> => {
  return apiRequest<User[]>('GET', '/admin/subadmins');
};

export const getAdminProfileApi = (): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('GET', '/admin/profile');
};

export const updateAdminProfileApi = (
  data: UpdateAdminRequest
): Promise<ApiResponse<Admin>> => {
  return apiRequest<Admin>('PUT', '/admin/profile', data);
};

export const updateSubadminApi = (
  id: string | number,
  data: UpdateUserRequest
): Promise<ApiResponse<User>> => {
  return apiRequest<User>('PUT', `/admin/subadmins/${id}`, data);
};

export const updateUserStatusApi = (
  userId: string | number,
  status: 'active' | 'pending' | 'inactive' | 'delete'
): Promise<ApiResponse<User>> => {
  return apiRequest<User>('PATCH', `/admin/users/${userId}`, { status });
};

export const updateUserByAdminApi = (
  userId: string | number,
  data: {
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    status: 'active' | 'pending' | 'inactive' | 'delete';
  }
): Promise<ApiResponse<User>> => {
  return apiRequest<User>('PUT', `/admin/users/${userId}`, data);
};

export const adminLogoutUserApi = (
  userId: string | number
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', `/admin/users/${userId}/logout`);
};

export const adminDeleteUserApi = (
  userId: string | number
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('DELETE', `/admin/users/${userId}`);
};

export const changeAdminPasswordApi = (body: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', '/admin/change-password', body);
};

export const changeSubadminPasswordApi = (
  subadminId: string | number,
  body: { newPassword: string; confirmPassword: string }
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('POST', `/admin/subadmins/${subadminId}/change-password`, body);
};

export const deleteSubadminApi = (
  id: string | number
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('DELETE', `/admin/subadmins/${id}`);
};