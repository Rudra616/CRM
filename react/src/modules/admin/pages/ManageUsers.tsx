import { useEffect, useState } from 'react';
import {
  getAdminUsersApi,
  getUsersApi,
  updateUserStatusApi,
  adminLogoutUserApi,
  updateUserByAdminApi,
} from '../api/admin.api';
import { showError, showSuccess } from '../../../shared/utils/toast';
import type { User } from '../../../shared/types/common.types';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';
import { EditUserModal, type EditUserProfilePayload } from '../../../shared/components/EditUserModal';
import { useAuth } from '../../../context/AuthContext';
import { FaEdit, FaSignOutAlt } from 'react-icons/fa';

const ManageUsers = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, 'active' | 'pending' | 'inactive' | 'delete'>>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await getAdminUsersApi(currentPage, rowsPerPage);
        const list = Array.isArray(res.data?.items) ? res.data.items : [];
        setUsers(list);
        setTotalRows(Number(res.data?.pagination?.total ?? 0));
        setTotalPages(Number(res.data?.pagination?.totalPages ?? 1));
        const drafts: Record<string, 'active' | 'pending' | 'inactive' | 'delete'> = {};
        for (const u of list) {
          drafts[String(u.id)] = (u.status as 'active' | 'pending' | 'inactive' | 'delete') || 'active';
        }
        setStatusDraft(drafts);
      } else {
        const res = await getUsersApi();
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list);
        setTotalRows(list.length);
        setTotalPages(Math.max(1, Math.ceil(list.length / rowsPerPage)));
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, isAdmin]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentUsers = isAdmin ? users : users.slice(startIndex, endIndex);

  const theadStyle = { backgroundColor: colors.cardPrimaryBg };
  const statusOptions: Array<'active' | 'pending' | 'inactive' | 'delete'> = ['active', 'pending', 'inactive', 'delete'];

  const handleUpdateStatus = async (user: User, next: 'active' | 'pending' | 'inactive' | 'delete') => {
    const id = user.id;
    try {
      setBusyUserId(id);
      const res = await updateUserStatusApi(id, next);
      const updated = res.data;
      if (next === 'delete') {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setTotalRows((prev) => Math.max(0, prev - 1));
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...(updated || {}), status: next } : u))
        );
      }
      showSuccess('User status updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update status');
      // revert local draft on error
      setStatusDraft((p) => ({
        ...p,
        [String(id)]: (user.status as any) || 'active',
      }));
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
    try {
      setBusyUserId(id);
      const status = statusDraft[String(id)] || 'active';
      const res = await updateUserByAdminApi(id, { ...data, status });
      const updated = res.data;
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...(updated || {}), status } : u))
      );
      showSuccess('User updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update user');
      throw err;
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <PageShell
      title="Manage Users"
      subtitle="View registered users"
      loading={loading}
      loadingMessage="Loading users…"
      flush
    >
      <div className="p-3 p-md-4">
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead style={theadStyle}>
              <tr className="fw-semibold small" style={{ color: colors.primary }}>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                {isAdmin && <th>Status</th>}
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user, index) => (
                <tr key={user.id}>
                  <td>{startIndex + index + 1}</td>
                  <td className="text-break">
                    {user.firstname} {user.lastname} ({user.username})
                  </td>
                  <td>{user.phone}</td>
                  <td className="text-break">{user.email}</td>
                  {isAdmin && (
                    <td style={{ minWidth: 180 }}>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`badge text-capitalize ${
                            (statusDraft[String(user.id)] || user.status || 'active') === 'active'
                              ? 'bg-success'
                              : (statusDraft[String(user.id)] || user.status) === 'pending'
                                ? 'bg-warning text-dark'
                                : (statusDraft[String(user.id)] || user.status) === 'inactive'
                                  ? 'bg-secondary'
                                  : 'bg-danger'
                          }`}
                        >
                          {statusDraft[String(user.id)] || user.status || 'active'}
                        </span>
                        <select
                          className="form-select form-select-sm text-capitalize"
                          style={{ maxWidth: 120 }}
                          value={statusDraft[String(user.id)] || user.status || 'active'}
                          onChange={(e) =>
                            setStatusDraft((p) => ({
                              ...p,
                              [String(user.id)]:
                                e.target.value as 'active' | 'pending' | 'inactive' | 'delete',
                            }))
                          }
                          onBlur={async (e) => {
                            const next = (e.target.value ||
                              statusDraft[String(user.id)] ||
                              user.status ||
                              'active') as 'active' | 'pending' | 'inactive' | 'delete';
                            if (next !== user.status) {
                              await handleUpdateStatus(user, next);
                            }
                          }}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s} className="text-capitalize">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td style={{ minWidth: 180 }}>
                      <div className="d-flex gap-1 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setEditUser(user)}
                          disabled={busyUserId === user.id}
                          title="Edit user"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-warning"
                          onClick={() => handleLogout(user.id)}
                          disabled={busyUserId === user.id}
                          title="Logout user"
                        >
                          <FaSignOutAlt size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {currentUsers.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 4} className="text-center text-muted py-4">
                    No users found
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
      {isAdmin && editUser && (
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
