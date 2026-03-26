import { useEffect, useState } from 'react';
import { getSubadminsApi, updateSubadminApi, deleteSubadminApi } from '../api/admin.api';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { EditUserModal } from '../../../shared/components/EditUserModal';
import type { User, Gender } from '../../../shared/types/common.types';

const ManageSubadmins = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const res = await getSubadminsApi();
      setUsers(res.data ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load subadmins');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (data: { username: string; firstname: string; lastname: string; email: string; phone: string; password?: string; gender: Gender }) => {
    if (!editUser) return;
    try {
      await updateSubadminApi(editUser.id, data);
      showSuccess('Subadmin updated');
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data } : u));
      setEditUser(null);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Update failed');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subadmin?')) return;
    try {
      await deleteSubadminApi(id);
      showSuccess('Subadmin deleted');
      setUsers(prev => prev.filter(u => u.id !== id));
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

  return (
    <>
      <h3 className="mb-4">Manage Subadmins</h3>

      <div className="table-responsive">
        <table className="table table-bordered table-striped align-middle">
          <thead className="table-light">
            <tr>
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
                <td>{user.firstname} {user.lastname}</td>
                <td className="d-none d-md-table-cell text-break">{user.email}</td>
                <td>{user.phone}</td>
                <td className="text-capitalize">{user.gender ?? '—'}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <button className="btn btn-sm btn-primary" onClick={() => setEditUser(user)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(String(user.id))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {currentUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center">No subadmins found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalRows > rowsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div>
            {startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
          </div>
          <div className="btn-group">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          title="Edit Subadmin"
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default ManageSubadmins;