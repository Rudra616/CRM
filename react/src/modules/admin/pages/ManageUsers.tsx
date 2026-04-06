import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, 'active' | 'pending' | 'inactive' | 'delete'>>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive' | 'delete'>('all');

  const rowsPerPage = 10;
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Pick up dashboard filter state
  useEffect(() => {
    const status = (location.state as any)?.statusFilter;
    if (status) {
      setStatusFilter(status);
      setCurrentPage(1); // start fresh
    }
  }, [location.state]);
useEffect(() => {
  const fetchUsers = async () => {
    const effectiveStatus = statusFilter === 'all' ? undefined : statusFilter;
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await getAdminUsersApi(currentPage, rowsPerPage, effectiveStatus);
        const data = res.data;
        setUsers(data?.items || []);
        setTotalRows(data?.pagination?.total || 0);
        setTotalPages(data?.pagination?.totalPages || 1);
        const drafts: Record<string, 'active' | 'pending' | 'inactive' | 'delete'> = {};
        for (const u of (data?.items || [])) {
          drafts[String(u.id)] = (u.status as any) || 'active';
        }
        setStatusDraft(drafts);
      } else {
        const res = await getUsersApi(currentPage, rowsPerPage, effectiveStatus);
        const data = res.data;
        setUsers(data?.items || []);
        setTotalRows(data?.pagination?.total || 0);
        setTotalPages(data?.pagination?.totalPages || 1);
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();
}, [currentPage, isAdmin, statusFilter]); // ✅ re-runs with fresh values every time

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const filteredUsers = users;
  const theadStyle = { backgroundColor: colors.cardPrimaryBg };
  const statusOptions: Array<'active' | 'pending' | 'inactive' | 'delete'> = ['active', 'pending', 'inactive', 'delete'];

  const handleUpdateStatus = async (user: User, next: 'active' | 'pending' | 'inactive' | 'delete') => {
    const id = user.id;
    try {
      setBusyUserId(id);
      const res = await updateUserStatusApi(id, next);
      const updated = res.data;

      // In handleUpdateStatus, after success, update users array correctly:
      setUsers(prev =>
        prev.map(u =>
          u.id === id ? { ...u, status: next } : u  // ← ensure status is updated
        )
      );

      setStatusDraft(p => ({
        ...p,
        [String(id)]: next,
      }));

      showSuccess('User status updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update status');
      setStatusDraft(p => ({
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
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...(updated || {}), status } : u)));
      showSuccess('User updated');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to update user');
      throw err;
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <PageShell title="Manage Users" subtitle="View registered users" loading={loading} loadingMessage="Loading users…" flush>
      <div className="p-3 p-md-4">
        {isAdmin && (
          <div className="mb-2 d-flex gap-2 align-items-center">
            <label className="small mb-0">Filter by status:</label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 150 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}            >
              <option value="all">All</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

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
              {filteredUsers.map((user, index) => {
                const currentStatus = statusDraft[String(user.id)] || user.status || 'active';
                return (
                  <tr key={user.id}>
                    <td>{startIndex + index + 1}</td>
                    <td className="text-break">{user.firstname} {user.lastname} ({user.username})</td>
                    <td>{user.phone}</td>
                    <td className="text-break">{user.email}</td>

                    {isAdmin && (
                      <td style={{ minWidth: 180 }}>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className={`badge text-capitalize ${currentStatus === 'active'
                              ? 'bg-success'
                              : currentStatus === 'pending'
                                ? 'bg-warning text-dark'
                                : currentStatus === 'inactive'
                                  ? 'bg-secondary'
                                  : 'bg-danger'
                              }`}
                          >
                            {currentStatus}
                          </span>

                          {/* Hide dropdown if status is "delete" */}
                          {currentStatus !== 'delete' && (
                            <select
                              className="form-select form-select-sm text-capitalize"
                              style={{ maxWidth: 120 }}
                              value={currentStatus}
                              disabled={busyUserId === user.id}
                              onChange={async (e) => {
                                const next = e.target.value as 'active' | 'pending' | 'inactive' | 'delete';
                                await handleUpdateStatus(user, next);
                              }}
                            >
                              {statusOptions.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    )}

                    {isAdmin && (
                      <td style={{ minWidth: 180 }}>
                        <div className="d-flex gap-1 flex-wrap">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditUser(user)} disabled={busyUserId === user.id} title="Edit user">
                            <FaEdit size={14} />
                          </button>
                          <button type="button" className="btn btn-sm btn-warning" onClick={() => handleLogout(user.id)} disabled={busyUserId === user.id} title="Logout user">
                            <FaSignOutAlt size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
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
                <button key={i} type="button" className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAdmin && editUser && (
        <EditUserModal user={editUser} title="Edit User" onClose={() => setEditUser(null)} onSave={handleEditUser} />
      )}
    </PageShell>
  );
};

export default ManageUsers;