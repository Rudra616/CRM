import axiosClient from '../../../shared/api/axiosClient';
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

export type RbacTableParams = {
  page: number;
  limit: number;
  search?: string;
};

const rbacTableSearchParams = (p: RbacTableParams): string => {
  const params = new URLSearchParams({
    page: String(p.page),
    limit: String(p.limit),
  });
  if (p.search?.trim()) params.set('search', p.search.trim());
  return params.toString();
};

export type ModuleTableItem = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

export type RoleTableItem = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
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

export const getAdminUsersApi = (p: UsersListParams): Promise<ApiResponse<UsersPageData>> =>
  apiRequest<UsersPageData>('GET', `/admin/users?${usersListSearchParams(p).toString()}`);

export const getAdminDashboardSummaryApi = (): Promise<ApiResponse<AdminDashboardSummary>> => {
  return apiRequest<AdminDashboardSummary>(
    'GET',
    '/admin/dashboard-summary'
  );
};

export const getModulesApi = async (): Promise<ApiResponse<ModuleItem[]>> => {
  const first = await getModulesTableApi({ page: 1, limit: 100 });
  const items: ModuleItem[] = [...(first.data?.items ?? [])];
  const totalPages = first.data?.pagination?.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const res = await getModulesTableApi({ page, limit: 100 });
    items.push(...(res.data?.items ?? []));
  }

  return {
    ...first,
    data: items,
  };
};

export const createModuleApi = (body: { name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/modules', body);

export const getModulesTableApi = (
  p: RbacTableParams
): Promise<ApiResponse<{ items: ModuleTableItem[]; pagination: UsersPageData['pagination'] }>> =>
  apiRequest<{ items: ModuleTableItem[]; pagination: UsersPageData['pagination'] }>(
    'GET',
    `/admin/modules/table?${rbacTableSearchParams(p)}`
  );

export const patchModuleApi = (
  id: number,
  body: { name?: string; status?: 'active' | 'inactive' }
): Promise<ApiResponse<null>> => apiRequest<null>('PATCH', `/admin/modules/${id}`, body);

export const deleteModuleApi = (id: number): Promise<ApiResponse<null>> =>
  apiRequest<null>('DELETE', `/admin/modules/${id}`);

export const getRolesApi = async (): Promise<ApiResponse<RoleItem[]>> => {
  const first = await getRolesTableApi({ page: 1, limit: 100 });
  const items: RoleItem[] = [...(first.data?.items ?? [])];
  const totalPages = first.data?.pagination?.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const res = await getRolesTableApi({ page, limit: 100 });
    items.push(...(res.data?.items ?? []));
  }

  return {
    ...first,
    data: items,
  };
};

export const createRoleApi = (body: { name: string }): Promise<ApiResponse<{ id: number }>> =>
  apiRequest<{ id: number }>('POST', '/admin/roles', body);

export const getRolesTableApi = (
  p: RbacTableParams
): Promise<ApiResponse<{ items: RoleTableItem[]; pagination: UsersPageData['pagination'] }>> =>
  apiRequest<{ items: RoleTableItem[]; pagination: UsersPageData['pagination'] }>(
    'GET',
    `/admin/roles/table?${rbacTableSearchParams(p)}`
  );

export const patchRoleApi = (
  id: number,
  body: { name?: string; status?: 'active' | 'inactive' }
): Promise<ApiResponse<null>> => apiRequest<null>('PATCH', `/admin/roles/${id}`, body);

export const deleteRoleApi = (id: number): Promise<ApiResponse<null>> =>
  apiRequest<null>('DELETE', `/admin/roles/${id}`);

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
  return apiRequest<User>('PATCH', `/admin/user/status/${userId}`, { status });
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
  return apiRequest<User>('PUT', `/admin/user/${userId}`, {
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
  return apiRequest<null>('POST', `/admin/user/${userId}/logout`);
};

export const adminDeleteUserApi = (
  userId: string | number
): Promise<ApiResponse<null>> => {
  return apiRequest<null>('DELETE', `/admin/user/${userId}`);
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

export type BroadcastItem = {
  id: number;
  message: string;
  is_delete: number;
  created_at: string;
};

export const createBroadcastApi = (body: {
  message: string;
}): Promise<ApiResponse<{ id: number; message: string; created_at: string }>> =>
  apiRequest<{ id: number; message: string; created_at: string }>('POST', '/admin/broadcast', body);

export const listBroadcastsApi = (
  limit = 50
): Promise<ApiResponse<{ items: BroadcastItem[] }>> =>
  apiRequest<{ items: BroadcastItem[] }>('GET', `/admin/broadcast?limit=${limit}`);

export const deleteBroadcastApi = (id: number): Promise<ApiResponse<null>> =>
  apiRequest<null>('DELETE', `/admin/broadcast/${id}`);

export type BulkImportRowError = {
  row: number;
  message: string;
};

export type BulkImportListItem = {
  id: number;
  file_name: string;
  file_path: string;
  validation_file_path: string | null;
  status: string;
  total_rows: number;
  valid_rows: number;
  validation_error_rows: number;
  created_at?: string;
};

export type BulkImportValidateSummary = {
  total: number;
  valid: number;
  validationErrors: number;
};

export type BulkImportValidateResult = {
  importId: number;
  summary: BulkImportValidateSummary;
};

export type BulkImportConfirmStarted = {
  started: true;
  importId: number;
  submitted: number;
};

/** Bulk import can run for minutes on large spreadsheets — avoid the default 10s client timeout. */
const BULK_IMPORT_TIMEOUT_MS = 5 * 60 * 1000;

const bulkImportOpenUrl = (importId: number, kind: 'file' | 'validation'): string => {
  const base = (axiosClient.defaults.baseURL ?? '/api').replace(/\/$/, '');
  const segment = kind === 'file' ? 'file' : 'validation';
  return `${base}/bulkimport/${importId}/${segment}`;
};

export const openBulkImportFileUrl = (importId: number): string =>
  bulkImportOpenUrl(importId, 'file');

export const openBulkImportValidationUrl = (importId: number): string =>
  bulkImportOpenUrl(importId, 'validation');

export const listBulkImportsApi = (): Promise<ApiResponse<{ items: BulkImportListItem[] }>> =>
  apiRequest<{ items: BulkImportListItem[] }>('GET', '/bulkimport');

export const validateBulkImportApi = (
  file: File
): Promise<ApiResponse<BulkImportValidateResult>> => {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<BulkImportValidateResult>('POST', '/bulkimport/validate', form, {
    timeout: BULK_IMPORT_TIMEOUT_MS,
  });
};

export const confirmBulkImportByIdApi = (
  importId: number
): Promise<ApiResponse<BulkImportConfirmStarted>> =>
  apiRequest<BulkImportConfirmStarted>(
    'POST',
    `/bulkimport/${importId}/confirm`,
    undefined,
    { timeout: BULK_IMPORT_TIMEOUT_MS }
  );

const parseCsvField = (line: string, start: number): { value: string; next: number } => {
  if (line[start] === '"') {
    let value = '';
    let i = start + 1;
    while (i < line.length) {
      if (line[i] === '"' && line[i + 1] === '"') {
        value += '"';
        i += 2;
        continue;
      }
      if (line[i] === '"') {
        return { value, next: i + 1 };
      }
      value += line[i];
      i += 1;
    }
    return { value, next: line.length };
  }

  const comma = line.indexOf(',', start);
  if (comma === -1) {
    return { value: line.slice(start), next: line.length };
  }
  return { value: line.slice(start, comma), next: comma };
};

/** Parses validation error CSV (Row,Error) into row errors for the modal. */
export const parseBulkImportValidationCsv = (csv: string): BulkImportRowError[] => {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const errors: BulkImportRowError[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const rowPart = parseCsvField(line, 0);
    const messageStart = rowPart.next === line.length ? line.length : rowPart.next + 1;
    const messagePart = parseCsvField(line, messageStart);
    const row = Number(rowPart.value);
    if (!Number.isFinite(row)) continue;
    errors.push({ row, message: messagePart.value.trim() });
  }
  return errors;
};

export const fetchBulkImportValidationCsvApi = async (importId: number): Promise<string> => {
  const res = await axiosClient.get(`/bulkimport/${importId}/validation`, {
    responseType: 'text',
    timeout: BULK_IMPORT_TIMEOUT_MS,
  });
  return String(res.data ?? '');
};
