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
    /** Page-size choices returned by the server (use for dropdown). */
    limitOptions?: number[];
  };
};

export type UsersListParams = {
  page: number;
  limit: number;
  statusFilter?: string;
  search?: string;
  deletedOnly?: boolean;
};

const usersListSearchParams = (p: UsersListParams): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(p.page));
  params.set('limit', String(p.limit));
  if (p.deletedOnly) params.set('deleted', '1');
  else if (p.statusFilter && p.statusFilter !== 'all') params.set('status', p.statusFilter);
  if (p.search?.trim()) params.set('search', p.search.trim());
  return params;
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
  name: string;
  status: 'active' | 'inactive';
};

export type RoleItem = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
};

export type RolePermissionEntry = {
  module_id: number;
  can_view: 0 | 1;
  can_add: 0 | 1;
  can_edit: 0 | 1;
  can_delete: 0 | 1;
};

export type RolePermissionSaveRow = {
  module_id: number;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};
export const getUsersApi = (p: UsersListParams): Promise<ApiResponse<UsersPageData>> =>
  apiRequest<UsersPageData>('GET', `/users?${usersListSearchParams(p).toString()}`);

export const getSubadminUsersApi = (p: UsersListParams): Promise<ApiResponse<UsersPageData>> =>
  apiRequest<UsersPageData>('GET', `/admin/users?${usersListSearchParams(p).toString()}`);

export const getAdminUsersApi = (p: UsersListParams): Promise<ApiResponse<UsersPageData>> =>
  apiRequest<UsersPageData>('GET', `/admin/users?${usersListSearchParams(p).toString()}`);

export const getAdminDashboardSummaryApi = (): Promise<ApiResponse<AdminDashboardSummary>> => {
  return apiRequest<AdminDashboardSummary>(
    'GET',
    '/admin/dashboard-summary'
  );
};

export const getModulesApi = (): Promise<ApiResponse<ModuleItem[]>> =>
  apiRequest<ModuleItem[]>('GET', '/admin/modules');

export const createModuleApi = (body: { name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/modules', body);

export const getRolesApi = (): Promise<ApiResponse<RoleItem[]>> =>
  apiRequest<RoleItem[]>('GET', '/admin/roles');

export const createRoleApi = (body: { name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/roles', body);

export const getRolePermissionsApi = (
  roleId: number
): Promise<ApiResponse<{ roleId: number; permissions: RolePermissionEntry[] }>> =>
  apiRequest<{ roleId: number; permissions: RolePermissionEntry[] }>(
    'GET',
    `/admin/roles/${roleId}/permissions`
  );

export const saveRolePermissionsApi = (
  roleId: number,
  permissions: RolePermissionSaveRow[]
): Promise<ApiResponse<{ roleId: number }>> =>
  apiRequest<{ roleId: number }>('PUT', `/admin/roles/${roleId}/permissions`, { permissions });

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

export const getSubadminsApi = (
  page: number,
  limit: number,
  search?: string
): Promise<ApiResponse<UsersPageData>> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search && search.trim() !== '') {
    params.append('search', search.trim());
  }
  return apiRequest<UsersPageData>('GET', `/admin/subadmins?${params.toString()}`);
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
    username: data.username,
    first_name: data.firstname,
    last_name: data.lastname,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    ...(data.role_id !== undefined ? { role_id: data.role_id } : {}),
  });
};

export const updateUserStatusApi = (
  userId: string | number,
  status: 'active' | 'pending' | 'inactive'
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
    status: 'active' | 'pending' | 'inactive';
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


// Add to admin.api.ts

export type PermissionEntry = {
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type PermissionMap = Record<string, PermissionEntry>;

export type MyPermissionsResponse = {
  isAdmin: boolean;
  permissions: PermissionMap;
};

export const getMyPermissionsApi = (): Promise<ApiResponse<MyPermissionsResponse>> =>
  apiRequest<MyPermissionsResponse>('GET', '/admin/me/permissions');