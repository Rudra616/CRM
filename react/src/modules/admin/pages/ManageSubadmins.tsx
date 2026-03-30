import { useEffect, useState } from 'react';
import {
  getSubadminsApi,
  updateSubadminApi,
  deleteSubadminApi,
  changeSubadminPasswordApi,
} from '../api/admin.api';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { EditUserModal, type EditUserProfilePayload } from '../../../shared/components/EditUserModal';
import type { User } from '../../../shared/types/common.types';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';

const ManageSubadmins = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getSubadminsApi();
      setUsers(res.data ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load subadmins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (data: EditUserProfilePayload) => {
    if (!editUser) return;
    try {
      const res = await updateSubadminApi(editUser.id, data);
      showSuccess('Subadmin updated');
      if (res.data) {
        setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...res.data } : u)));
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

      const totalPages = Math.ceil((users.length - 1) / rowsPerPage);
      if (currentPage > totalPages) setCurrentPage(totalPages || 1);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Delete failed');
    }
  };

  const totalRows = users.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

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
          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle mb-0">
              <thead style={theadStyle}>
                <tr className="fw-semibold small" style={{ color: colors.primary }}>
                  <th>#</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th className="d-none d-md-table-cell">Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{startIndex + index + 1}</td>
                    <td className="text-break">{user.username}</td>
                    <td>
                      {user.firstname} {user.lastname}
                    </td>
                    <td className="d-none d-md-table-cell text-break">{user.email}</td>
                    <td>{user.phone}</td>
                    <td className="text-capitalize">{user.gender ?? '—'}</td>
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

          {totalRows > rowsPerPage && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <div className="text-muted small">
                {startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
              </div>
              <div className="btn-group">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
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
        />
      )}
    </>
  );
};

export default ManageSubadmins;
