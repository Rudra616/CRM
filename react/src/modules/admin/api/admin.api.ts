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

export type ModuleItem = {
  id: number;
  key: string;
  name: string;
  status: 'active' | 'inactive';
};

export type RoleItem = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
};
export const getUsersApi = (
  page: number,
  limit: number,
  statusFilter?: string,
  search?: string
): Promise<ApiResponse<UsersPageData>> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

  if (search && search.trim() !== '') {
    params.append('search', search.trim());
  }

  return apiRequest<UsersPageData>('GET', `/users?${params.toString()}`);
};

export const getSubadminUsersApi = (
  page: number,
  limit: number,
  statusFilter?: string,
  search?: string
): Promise<ApiResponse<UsersPageData>> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  if (search && search.trim() !== '') {
    params.append('search', search.trim());
  }

  return apiRequest<UsersPageData>('GET', `/admin/users?${params.toString()}`);
};

export const getAdminUsersApi = (
  page: number,
  limit: number,
  statusFilter?: string,
  search?: string
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }

  if (search && search.trim() !== '') {
    params.append('search', search.trim());
  }

  return apiRequest('GET', `/admin/users?${params.toString()}`);
};

export const getAdminDashboardSummaryApi = (): Promise<ApiResponse<AdminDashboardSummary>> => {
  return apiRequest<AdminDashboardSummary>(
    'GET',
    '/admin/dashboard-summary'
  );
};

export const getModulesApi = (): Promise<ApiResponse<ModuleItem[]>> =>
  apiRequest<ModuleItem[]>('GET', '/admin/modules');

export const createModuleApi = (body: { key: string; name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/modules', body);

export const getRolesApi = (): Promise<ApiResponse<RoleItem[]>> =>
  apiRequest<RoleItem[]>('GET', '/admin/roles');

export const createRoleApi = (body: { name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/roles', body);

export const getRolePermissionsApi = (roleId: number): Promise<ApiResponse<{ roleId: number; moduleIds: number[] }>> =>
  apiRequest<{ roleId: number; moduleIds: number[] }>('GET', `/admin/roles/${roleId}/permissions`);

export const saveRolePermissionsApi = (
  roleId: number,
  moduleIds: number[]
): Promise<ApiResponse<{ roleId: number }>> =>
  apiRequest<{ roleId: number }>('PUT', `/admin/roles/${roleId}/permissions`, { moduleIds });

export const getAdminMyModulesApi = (): Promise<ApiResponse<{ moduleKeys: string[] }>> =>
  apiRequest<{ moduleKeys: string[] }>('GET', '/admin/me/modules');

export const getSubadminMyModulesApi = (): Promise<ApiResponse<{ moduleKeys: string[] }>> =>
  apiRequest<{ moduleKeys: string[] }>('GET', '/subadmin/me/modules');

export const getMyModulesApi = async (
  role: 'admin' | 'subadmin'
): Promise<ApiResponse<{ moduleKeys: string[] }>> => {
  if (role === 'admin') {
    return getAdminMyModulesApi();
  }
  try {
    return await getSubadminMyModulesApi();
  } catch {
    // Backward compatibility if an older backend only exposes /admin/me/modules.
    return getAdminMyModulesApi();
  }
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
  return apiRequest<User>('PUT', `/admin/subadmins/${id}`, {
    ...data,
    first_name: (data as unknown as { firstname?: string }).firstname,
    last_name: (data as unknown as { lastname?: string }).lastname,
  });
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
  return apiRequest<User>('PUT', `/admin/users/${userId}`, {
    username: data.username,
    first_name: data.firstname,
    last_name: data.lastname,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    status: data.status,
  });
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