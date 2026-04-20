import { useCallback, useEffect, useState } from 'react';
import {
  getSubadminsApi,
  getRolesApi,
  updateSubadminApi,
  deleteSubadminApi,
  changeSubadminPasswordApi,
  type RoleItem,
} from '../api/admin.api';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { EditUserModal, type EditUserProfilePayload } from '../../../shared/components/EditUserModal';
import type { User } from '../../../shared/types/common.types';
import type { UsersPageData } from '../api/admin.api';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';
import { FaSearch, FaTimes } from 'react-icons/fa';

type SubadminRow = User & {
  first_name?: string;
  last_name?: string;
  role_id?: number;
  role_name?: string;
};

const subadminDisplayName = (u: SubadminRow) => {
  const fn = u.firstname ?? u.first_name ?? '';
  const ln = u.lastname ?? u.last_name ?? '';
  const full = `${fn} ${ln}`.trim();
  const label = full || '—';
  return `${label} (${u.username})`;
};

const mergeSubadminFromApi = (prev: User, raw: SubadminRow): User => ({
  ...prev,
  ...raw,
  firstname: raw.firstname ?? raw.first_name ?? prev.firstname ?? '',
  lastname: raw.lastname ?? raw.last_name ?? prev.lastname ?? '',
  role_id: raw.role_id ?? prev.role_id,
  role_name: raw.role_name ?? prev.role_name,
});

const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100];

const ManageSubadmins = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>(DEFAULT_PAGE_SIZES);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSubadminsApi(currentPage, rowsPerPage, appliedSearchTerm);
      const payload = res.data as UsersPageData | undefined;
      const rows = (payload?.items ?? []) as SubadminRow[];
      setUsers(rows.map((row) => mergeSubadminFromApi(row as User, row)));
      const p = payload?.pagination;
      setTotalRows(p?.total ?? 0);
      setTotalPages(Math.max(1, p?.totalPages ?? 1));
      if (p?.limit != null) setRowsPerPage(p.limit);
      if (Array.isArray(p?.limitOptions) && p.limitOptions.length > 0) {
        setPageSizeOptions(p.limitOptions);
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load subadmins');
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, appliedSearchTerm]);

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

  useEffect(() => {
    void getRolesApi()
      .then((res) => setRoles(res.data ?? []))
      .catch(() => setRoles([]));
  }, []);

  const handleSave = async (data: EditUserProfilePayload) => {
    if (!editUser) return;
    try {
      const res = await updateSubadminApi(editUser.id, {
        username: data.username,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        ...(data.role_id !== undefined ? { role_id: data.role_id } : {}),
      });
      showSuccess('Subadmin updated');
      if (res.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editUser.id ? mergeSubadminFromApi(u, res.data as SubadminRow) : u))
        );
      } else {
        setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...data } : u)));
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Update failed');
      throw err;
    }
  };

  const handleChangePassword = async (body: { newPassword: string; confirmPassword: string }) => {
    if (!editUser) return;
    await changeSubadminPasswordApi(editUser.id, body);
    showSuccess('Subadmin password updated');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subadmin?')) return;
    try {
      await deleteSubadminApi(id);
      showSuccess('Subadmin deleted');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setEditUser(null);
      if (users.length <= 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        void fetchUsers();
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Delete failed');
    }
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentUsers = users;

  const theadStyle = { backgroundColor: colors.cardPrimaryBg };

  return (
    <>
      <PageShell
        title="Manage Subadmins"
        subtitle="Edit or remove subadmin accounts"
        loading={loading}
        loadingMessage="Loading subadmins…"
        flush
      >
        <div className="p-3 p-md-4">
          <div className="d-flex flex-column gap-3 mb-3">
            <div className="d-flex flex-column flex-xl-row flex-xl-nowrap align-items-stretch align-items-xl-end gap-3">
              <div className="flex-shrink-0">
                <label htmlFor="subadmin-rows-limit" className="form-label small text-muted mb-1">
                  Rows per page
                </label>
                <select
                  id="subadmin-rows-limit"
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

              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <label htmlFor="subadmin-search" className="form-label small text-muted mb-1">
                  Search
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0 py-1" id="subadmin-search-addon">
                    <FaSearch className="text-secondary" size={14} aria-hidden />
                  </span>
                  <input
                    id="subadmin-search"
                    type="search"
                    className="form-control border-start-0"
                    placeholder="Name, username, email, phone, gender…"
                    aria-describedby="subadmin-search-addon"
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
                Total <span className="fw-semibold text-dark">{totalRows}</span>
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle mb-0">
              <thead style={theadStyle}>
                <tr className="fw-semibold small" style={{ color: colors.primary }}>
                  <th>#</th>
                  <th>Name</th>
                  <th className="d-none d-md-table-cell">Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th className="d-none d-lg-table-cell">Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{startIndex + index + 1}</td>
                    <td className="text-break">{subadminDisplayName(user as SubadminRow)}</td>
                    <td className="d-none d-md-table-cell text-break">{user.email}</td>
                    <td>{user.phone}</td>
                    <td className="text-capitalize">{user.gender ?? '—'}</td>
                    <td className="d-none d-lg-table-cell text-break small">
                      {(user as SubadminRow).role_name ?? '—'}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditUser(user)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(String(user.id))}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No subadmins found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRows > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <div className="text-muted small">
                {startIndex + 1}–{startIndex + currentUsers.length} of {totalRows}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={{ minWidth: 36 }}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </PageShell>

      {editUser && (
        <EditUserModal
          user={editUser}
          title="Edit Subadmin"
          onClose={() => setEditUser(null)}
          onSave={handleSave}
          onChangePassword={handleChangePassword}
          roleOptions={roles.map((r) => ({ id: r.id, name: r.name }))}
        />
      )}
    </>
  );
};

export default ManageSubadmins;
