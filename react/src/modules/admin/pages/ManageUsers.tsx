import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getAdminUsersApi,
  getSubadminUsersApi,
  getUsersApi,
  updateUserStatusApi,
  adminLogoutUserApi,
  updateUserByAdminApi,
  adminDeleteUserApi,
  type UsersPageData,
} from '../api/admin.api';
import { showError, showSuccess } from '../../../shared/utils/toast';
import type { User } from '../../../shared/types/common.types';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';
import { EditUserModal, type EditUserProfilePayload } from '../../../shared/components/EditUserModal';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { FaEdit, FaSearch, FaSignOutAlt, FaTimes, FaTrash } from 'react-icons/fa';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';

type StatusFilter = 'all' | 'active' | 'pending' | 'inactive' | 'deleted';
type AccountStatus = 'active' | 'pending' | 'inactive';

const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100];

const isUserRemoved = (u: User): boolean =>
  Number((u as { is_delete?: number }).is_delete) === 1;

const ManageUsers = () => {
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const location = useLocation();

  // ─── Role flags ───────────────────────────────────────────────────────────
  // isAdmin  → true only for the ADMIN role (admin sees everything, no restrictions)
  // isSubadmin → true for subadmin role (respects DB permissions)
  const isAdmin = user?.role === 'admin';
  const isSubadmin = user?.role === 'subadmin';

  // ─── Permissions ──────────────────────────────────────────────────────────
  // For ADMIN: getModulePerm always returns all true (handled inside PermissionContext)
  // For SUBADMIN: reads from DB via /admin/me/permissions
  const perm = getModulePerm(PERMISSION_MODULE_KEYS.USER);

  // Derived convenience flags
  const canEdit = perm.can_edit;    // show Status column + Edit + Logout buttons
  const canDelete = perm.can_delete;  // show Delete button
  const hasActions = canEdit || canDelete; // show Actions column at all

  // ─── State ────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, AccountStatus>>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>(DEFAULT_PAGE_SIZES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // ─── Fetch users ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    const deletedOnly = statusFilter === 'deleted';
    const effectiveStatus =
      statusFilter === 'all' || statusFilter === 'deleted' ? undefined : statusFilter;

    const params = {
      page: currentPage,
      limit: rowsPerPage,
      statusFilter: effectiveStatus,
      search: appliedSearchTerm,
      deletedOnly,
    };

    setLoading(true);
    try {
      let res;
      if (isAdmin) res = await getAdminUsersApi(params);
      else if (isSubadmin) res = await getSubadminUsersApi(params);
      else res = await getUsersApi(params);

      const data = res.data as UsersPageData | undefined;
      const items = data?.items ?? [];
      const p = data?.pagination;

      setUsers(items);

      if (p) {
        setPagination({
          page: p.page,
          limit: p.limit,
          total: p.total,
          totalPages: Math.max(1, p.totalPages),
        });
        setRowsPerPage(p.limit);
        if (Array.isArray(p.limitOptions) && p.limitOptions.length > 0) {
          setPageSizeOptions(p.limitOptions);
        }
        setCurrentPage((prev) => {
          const tp = Math.max(1, p.totalPages);
          return Math.min(Math.max(1, prev), tp);
        });
      }

      const drafts: Record<string, AccountStatus> = {};
      for (const row of items) {
        const st = (row.status as AccountStatus) || 'active';
        drafts[String(row.id)] = ['active', 'pending', 'inactive'].includes(st) ? st : 'active';
      }
      setStatusDraft(drafts);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, isAdmin, isSubadmin, statusFilter, appliedSearchTerm]);

  // ─── Sync statusFilter from navigation state ──────────────────────────────
  useEffect(() => {
    const st = (location.state as { statusFilter?: string })?.statusFilter;
    if (!st) return;
    setCurrentPage(1);
    if (st === 'delete' || st === 'deleted') setStatusFilter('deleted');
    else if (st === 'all' || st === 'active' || st === 'pending' || st === 'inactive') {
      setStatusFilter(st as StatusFilter);
    }
  }, [location.state]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const applySearch = () => {
    setCurrentPage(1);
    setAppliedSearchTerm(searchTerm.trim());
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setAppliedSearchTerm('');
  };

  // ─── Derived values ───────────────────────────────────────────────────────
  const limit = pagination.limit || rowsPerPage;
  const startIndex = (pagination.page - 1) * limit;
  const endIndex = startIndex + users.length;

  // Dynamic colspan: base 4 cols (#, Name, Phone, Email) + optional Status + optional Action
  const colSpan =
    4 + (canEdit ? 1 : 0) + (hasActions ? 1 : 0);

  const theadStyle = { backgroundColor: colors.cardPrimaryBg };
  const statusOptions: AccountStatus[] = ['active', 'pending', 'inactive'];

  const filterSelectOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'deleted', label: 'Removed' },
  ];

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (u: User, next: AccountStatus) => {
    const id = u.id;
    if (isUserRemoved(u)) return;
    try {
      setBusyUserId(id);
      await updateUserStatusApi(id, next);
      setUsers((prev) => prev.map((row) => (row.id === id ? { ...row, status: next } : row)));
      setStatusDraft((prev) => ({ ...prev, [String(id)]: next }));
      showSuccess('User status updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update status');
      setStatusDraft((prev) => ({
        ...prev,
        [String(id)]: (u.status as AccountStatus) || 'active',
      }));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSoftDelete = async (u: User) => {
    if (isUserRemoved(u)) return;
    if (!confirm(`Remove "${u.username}"? They will no longer be able to sign in.`)) return;
    try {
      setBusyUserId(u.id);
      await adminDeleteUserApi(u.id);
      showSuccess('User removed');
      setEditUser((cur) => (cur?.id === u.id ? null : cur));
      await fetchUsers();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to remove user');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleLogout = async (id: string | number) => {
    try {
      setBusyUserId(id);
      await adminLogoutUserApi(id);
      showSuccess('User logged out');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to logout user');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleEditUser = async (data: EditUserProfilePayload) => {
    if (!editUser) return;
    const id = editUser.id;
    if (isUserRemoved(editUser)) return;
    try {
      setBusyUserId(id);
      const status = statusDraft[String(id)] || 'active';
      const res = await updateUserByAdminApi(id, { ...data, status });
      const updated = res.data;
      setUsers((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...(updated || {}), status } : row))
      );
      showSuccess('User updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update user');
      throw err;
    } finally {
      setBusyUserId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageShell
      title="Manage Users"
      subtitle="View registered users"
      loading={loading}
      loadingMessage="Loading users…"
      flush
    >
      <div className="p-3 p-md-4">

        {/* Toolbar: status + rows + search + total */}
        <div className="d-flex flex-column gap-3 mb-3">
          <div className="d-flex flex-column flex-xl-row flex-xl-nowrap align-items-stretch align-items-xl-end gap-3">
            <div className="d-flex flex-wrap align-items-end gap-3">
              {isAdmin ? (
                <div className="flex-shrink-0">
                  <label htmlFor="user-status-filter" className="form-label small text-muted mb-1">
                    Status
                  </label>
                  <select
                    id="user-status-filter"
                    className="form-select form-select-sm"
                    style={{ minWidth: 152 }}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as StatusFilter);
                      setCurrentPage(1);
                    }}
                  >
                    {filterSelectOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex-shrink-0">
                <label htmlFor="user-rows-limit" className="form-label small text-muted mb-1">
                  Rows per page
                </label>
                <select
                  id="user-rows-limit"
                  className="form-select form-select-sm"
                  style={{ minWidth: 88 }}
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <label htmlFor="user-search" className="form-label small text-muted mb-1">
                Search
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0 py-1" id="user-search-addon">
                  <FaSearch className="text-secondary" size={14} aria-hidden />
                </span>
                <input
                  id="user-search"
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Name, username, email, gender…"
                  aria-describedby="user-search-addon"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applySearch();
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary px-2"
                  title="Search"
                  aria-label="Search"
                  onClick={() => applySearch()}
                >
                  <FaSearch size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-2"
                  title="Clear search"
                  aria-label="Clear search"
                  onClick={() => clearSearch()}
                >
                  <FaTimes size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className="text-muted small text-xl-end text-nowrap align-self-xl-center ms-xl-auto pt-1 pt-xl-0">
              Total{' '}
              <span className="fw-semibold text-dark">{pagination.total}</span>
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead style={theadStyle}>
              <tr className="fw-semibold small" style={{ color: colors.primary }}>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>

                {/*
                  Status column:
                  - ADMIN     → always visible (getModulePerm returns all true for admin)
                  - SUBADMIN  → visible only if DB permission can_edit = 1
                */}
                {canEdit && <th>Status</th>}

                {/*
                  Action column:
                  - ADMIN     → always visible
                  - SUBADMIN  → visible only if can_edit OR can_delete is true
                */}
                {hasActions && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {users.map((row, index) => {
                const removed = isUserRemoved(row);
                const currentStatus = statusDraft[String(row.id)] || row.status || 'active';
                const firstName = (row as unknown as { first_name?: string }).first_name ?? row.firstname ?? '';
                const lastName = (row as unknown as { last_name?: string }).last_name ?? row.lastname ?? '';

                return (
                  <tr key={row.id} className={removed ? 'table-secondary' : undefined}>
                    <td>{startIndex + index + 1}</td>
                    <td className="text-break">
                      {`${firstName} ${lastName}`.trim()} ({row.username})
                    </td>
                    <td>{row.phone}</td>
                    <td className="text-break">{row.email}</td>

                    {/* ── Status cell ──────────────────────────────────────── */}
                    {canEdit && (
                      <td style={{ minWidth: 200 }}>
                        {removed ? (
                          <span className="badge bg-dark">Removed</span>
                        ) : (
                          <div className="d-flex align-items-center flex-wrap gap-1">
                            {/* Badge showing current status */}
                            <span className={`badge text-capitalize ${currentStatus === 'active'
                                ? 'bg-success'
                                : currentStatus === 'pending'
                                  ? 'bg-warning text-dark'
                                  : 'bg-secondary'
                              }`}>
                              {currentStatus}
                            </span>

                            {/*
                              Status change dropdown:
                              - ADMIN    → always shown (perm.can_edit = true)
                              - SUBADMIN → shown only if can_edit = true (same condition as column)
                              Both handled by canEdit already — no extra check needed
                            */}
                            <select
                              className="form-select form-select-sm text-capitalize ms-1"
                              style={{ maxWidth: 120 }}
                              value={currentStatus}
                              disabled={busyUserId === row.id}
                              onChange={async (e) => {
                                await handleUpdateStatus(row, e.target.value as AccountStatus);
                              }}
                            >
                              {statusOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                    )}

                    {/* ── Action cell ───────────────────────────────────────── */}
                    {hasActions && (
                      <td style={{ minWidth: 160 }}>
                        <div className="d-flex gap-1 flex-wrap">

                          {/*
                            Edit button:
                            - ADMIN    → always shown
                            - SUBADMIN → shown only if can_edit = true
                          */}
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => setEditUser(row)}
                              disabled={busyUserId === row.id || removed}
                              title="Edit user"
                            >
                              <FaEdit size={14} />
                            </button>
                          )}

                          {/*
                            Logout button:
                            - ADMIN    → always shown
                            - SUBADMIN → shown only if can_edit = true
                          */}
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning"
                              onClick={() => handleLogout(row.id)}
                              disabled={busyUserId === row.id || removed}
                              title="Logout user"
                            >
                              <FaSignOutAlt size={14} />
                            </button>
                          )}

                          {/*
                            Delete button:
                            - ADMIN    → always shown
                            - SUBADMIN → shown only if can_delete = true
                          */}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => void handleSoftDelete(row)}
                              disabled={busyUserId === row.id || removed}
                              title="Remove user (soft delete)"
                            >
                              <FaTrash size={14} />
                            </button>
                          )}

                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  {/* colSpan is dynamic based on how many columns are visible */}
                  <td colSpan={colSpan} className="text-center text-muted py-4">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {pagination.total > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <div className="text-muted small">
              {startIndex + 1}–{endIndex} of {pagination.total}
              <span className="ms-1">(page {pagination.page} of {pagination.totalPages})</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : 'btn-outline-primary'
                    }`}
                  style={{ minWidth: 36 }}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/*
        Edit modal:
        - ADMIN    → always available (canEdit = true)
        - SUBADMIN → only if can_edit = true
      */}
      {canEdit && editUser && (
        <EditUserModal
          user={editUser}
          title="Edit User"
          onClose={() => setEditUser(null)}
          onSave={handleEditUser}
        />
      )}
    </PageShell>
  );
};

export default ManageUsers;