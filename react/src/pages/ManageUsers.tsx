import { useEffect, useState } from "react";
import { getUsersApi } from "../api/authApi";
import { showError } from "../utils/toast";
import type { User } from "../types/apiTypes";

const ManageUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Pagination calculation
  const totalRows = users.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  return (
    <>
      <h3 className="mb-4">Manage Users</h3>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <>
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
                    <td className="text-capitalize">{user.gender ?? "—"}</td>

                  </tr>
                ))}
                {currentUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalRows > rowsPerPage && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <div>
                {startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
              </div>

              <div className="btn-group">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${currentPage === i + 1 ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ManageUsers;