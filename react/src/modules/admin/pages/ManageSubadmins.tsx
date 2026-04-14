import { useEffect, useState } from 'react';
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
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';

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
  const rowsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getSubadminsApi(currentPage, rowsPerPage, appliedSearchTerm);
      const payload = res.data as { items: SubadminRow[]; pagination: { total: number; totalPages: number } };
      const rows = payload?.items ?? [];
      setUsers(rows.map((row) => mergeSubadminFromApi(row as User, row)));
      setTotalRows(payload?.pagination?.total ?? 0);
      setTotalPages(payload?.pagination?.totalPages ?? 1);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load subadmins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [currentPage, appliedSearchTerm]);

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
  const endIndex = startIndex + rowsPerPage;
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
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
            <div className="text-muted small">
              Total: <span className="fw-semibold text-dark">{totalRows}</span>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <input
                type="text"
                placeholder="Search by name, username, email, phone, gender..."
                className="form-control form-control-sm"
                style={{ minWidth: 260 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPage(1);
                    setAppliedSearchTerm(searchTerm.trim());
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setCurrentPage(1);
                  setAppliedSearchTerm(searchTerm.trim());
                }}
              >
                Search
              </button>
              {/* <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                  setAppliedSearchTerm('');
                }}
              >
                Clear
              </button> */}
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
                {startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
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
