import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createRoleApi,
  deleteRoleApi,
  getRolesTableApi,
  patchRoleApi,
  type RoleTableItem,
} from '../api/admin.api';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { Link } from 'react-router-dom';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';
import { LIST_PAGE_SIZE_OPTIONS } from '../../../shared/constants/pagination';
import { ListTableToolbar } from '../../../shared/components/ListTableToolbar';
import { FaEdit, FaTrash } from 'react-icons/fa';

const DEFAULT_PAGE_SIZES = [...LIST_PAGE_SIZE_OPTIONS];

const fmtWhen = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const ManageRolesPage = () => {
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const isOwner = user?.is_main_admin;
  const perm = getModulePerm(PERMISSION_MODULE_KEYS.MODULE);
  const canView = isOwner || perm.can_view;
  const canAdd = isOwner || perm.can_add;
  const canEdit = isOwner || perm.can_edit;
  const canDelete = isOwner || perm.can_delete;

  const rbacBase = '/admin/rbac';

  const [rows, setRows] = useState<RoleTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>(DEFAULT_PAGE_SIZES);

  const [newName, setNewName] = useState('');
  const [editRow, setEditRow] = useState<RoleTableItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const fetchRows = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await getRolesTableApi({
        page: currentPage,
        limit: rowsPerPage,
        search: appliedSearchTerm,
      });
      const payload = res.data;
      setRows(payload?.items ?? []);
      const p = payload?.pagination;
      setTotalRows(p?.total ?? 0);
      setTotalPages(Math.max(1, p?.totalPages ?? 1));
      if (p?.limit != null) setRowsPerPage(p.limit);
      if (Array.isArray(p?.limitOptions) && p.limitOptions.length > 0) {
        setPageSizeOptions(p.limitOptions);
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [canView, currentPage, rowsPerPage, appliedSearchTerm]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const applySearch = () => {
    setCurrentPage(1);
    setAppliedSearchTerm(searchTerm.trim());
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setAppliedSearchTerm('');
  };

  const startIndex = (currentPage - 1) * rowsPerPage;

  const theadStyle = useMemo(() => ({ backgroundColor: colors.cardPrimaryBg }), []);

  const openEdit = (row: RoleTableItem) => {
    setEditRow(row);
    setEditName(row.name);
    setEditStatus(row.status);
  };

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    try {
      await patchRoleApi(editRow.id, {
        name: editName,
        status: editStatus,
      });
      showSuccess('Role updated');
      setEditRow(null);
      void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Update failed');
    }
  };

  const onStatusInline = async (row: RoleTableItem, status: 'active' | 'inactive') => {
    if (status === row.status) return;
    try {
      await patchRoleApi(row.id, { status });
      showSuccess('Status updated');
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Update failed');
    }
  };

  const onDelete = async (row: RoleTableItem) => {
    if (!confirm(`Remove role "${row.name}"?`)) return;
    try {
      await deleteRoleApi(row.id);
      showSuccess('Role removed');
      if (rows.length <= 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Delete failed');
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createRoleApi({ name: newName });
      setNewName('');
      showSuccess('Role created');
      setCurrentPage(1);
      void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Create failed');
    }
  };

  if (!canView) {
    return (
      <PageShell title="Roles" subtitle="Manage roles">
        <div className="p-4 text-muted">You do not have permission to view roles.</div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title="Roles"
        subtitle="List, edit status, or remove roles (same fields as DB)"
        loading={loading}
        loadingMessage="Loading roles…"
        flush
      >
        <div className="p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <div className="small text-muted">
              <Link to={`${rbacBase}/modules`}>Modules</Link>
              <span className="mx-2">·</span>
              <Link to={`${rbacBase}/permissions`}>Role permissions</Link>
            </div>
          </div>

          {canAdd && (
            <form className="row g-2 align-items-end mb-4" onSubmit={onCreate}>
              <div className="col-12 col-md-8 col-lg-6">
                <label className="form-label small text-muted mb-1">New role name</label>
                <input
                  className="form-control form-control-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. support"
                />
              </div>
              <div className="col-auto">
                <button type="submit" className="btn btn-primary btn-sm">
                  Add role
                </button>
              </div>
            </form>
          )}

          <ListTableToolbar
            rowsPerPage={rowsPerPage}
            pageSizeOptions={pageSizeOptions}
            totalRows={totalRows}
            searchTerm={searchTerm}
            searchPlaceholder="Role name..."
            searchId="role-search"
            onRowsPerPageChange={(next) => {
              setRowsPerPage(next);
              setCurrentPage(1);
            }}
            onSearchTermChange={setSearchTerm}
            onApplySearch={applySearch}
            onClearSearch={clearSearch}
          />

          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle mb-0">
              <thead style={theadStyle}>
                <tr className="fw-semibold small" style={{ color: colors.primary }}>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="d-none d-lg-table-cell">created_at</th>
                  <th className="d-none d-xl-table-cell">updated_at</th>
                  {(canEdit || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="text-break">{row.name}</td>
                    <td>
                      {canEdit ? (
                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: 140 }}
                          value={row.status}
                          onChange={(e) =>
                            void onStatusInline(row, e.target.value as 'active' | 'inactive')
                          }
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <span className="text-capitalize">{row.status}</span>
                      )}
                    </td>
                    <td className="d-none d-lg-table-cell small">{fmtWhen(row.created_at)}</td>
                    <td className="d-none d-xl-table-cell small">{fmtWhen(row.updated_at)}</td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => openEdit(row)}
                              title="Edit role"
                              aria-label="Edit role"
                            >
                              <FaEdit size={13} aria-hidden />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => void onDelete(row)}
                              title="Delete role"
                              aria-label="Delete role"
                            >
                              <FaTrash size={13} aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={(canEdit || canDelete) ? 6 : 5}
                      className="text-center text-muted py-4"
                    >
                      No roles found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRows > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <div className="text-muted small">
                {startIndex + 1}–{startIndex + rows.length} of {totalRows}
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

      {editRow && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div
            className="modal fade show d-block"
            style={{ zIndex: 1050 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-role-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={onSaveEdit}>
                  <div className="modal-header">
                    <h2 className="modal-title fs-5" id="edit-role-title">
                      Edit role
                    </h2>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => setEditRow(null)}
                    />
                  </div>
                  <div className="modal-body">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control mb-3"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditRow(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ManageRolesPage;
