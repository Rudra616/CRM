import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createModuleApi,
  deleteModuleApi,
  getModulesTableApi,
  patchModuleApi,
  type ModuleTableItem,
} from '../api/admin.api';
import { PageShell } from '../../../shared/components/PageShell';
import { colors } from '../../../theme/colors';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';

const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100];

const fmtWhen = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const ManageModulesPage = () => {
  const { user } = useAuth();
  const { getRoutePerm } = usePermissions();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const perm = getRoutePerm(location.pathname);
  const canView = isAdmin || perm.can_view;
  const canAdd = isAdmin || perm.can_add;
  const canEdit = isAdmin || perm.can_edit;
  const canDelete = isAdmin || perm.can_delete;

  const rbacBase = user?.role === 'admin' ? '/admin/rbac' : '/subadmin/rbac';

  const [rows, setRows] = useState<ModuleTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>(DEFAULT_PAGE_SIZES);

  const [newName, setNewName] = useState('');
  const [editRow, setEditRow] = useState<ModuleTableItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const fetchRows = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await getModulesTableApi({
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
      showError((err as { message?: string })?.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, [canView, currentPage, rowsPerPage, appliedSearchTerm]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const applySearch = () => {
    setCurrentPage(1);
    setAppliedSearchTerm(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setAppliedSearchTerm('');
  };

  const startIndex = (currentPage - 1) * rowsPerPage;

  const theadStyle = useMemo(() => ({ backgroundColor: colors.cardPrimaryBg }), []);

  const openEdit = (row: ModuleTableItem) => {
    setEditRow(row);
    setEditName(row.name);
    setEditStatus(row.status);
  };

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    try {
      await patchModuleApi(editRow.id, {
        name: editName,
        status: editStatus,
      });
      showSuccess('Module updated');
      setEditRow(null);
      void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Update failed');
    }
  };

  const onStatusInline = async (row: ModuleTableItem, status: 'active' | 'inactive') => {
    if (status === row.status) return;
    try {
      await patchModuleApi(row.id, { status });
      showSuccess('Status updated');
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Update failed');
    }
  };

  const onDelete = async (row: ModuleTableItem) => {
    if (!confirm(`Remove module "${row.name}"?`)) return;
    try {
      await deleteModuleApi(row.id);
      showSuccess('Module removed');
      if (rows.length <= 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Delete failed');
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createModuleApi({ name: newName });
      setNewName('');
      showSuccess('Module created');
      setCurrentPage(1);
      void fetchRows();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Create failed');
    }
  };

  if (!canView) {
    return (
      <PageShell title="Modules" subtitle="Manage application modules">
        <div className="p-4 text-muted">You do not have permission to view modules.</div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title="Modules"
        subtitle="List, edit status, or remove modules (same fields as DB)"
        loading={loading}
        loadingMessage="Loading modules…"
        flush
      >
        <div className="p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div className="small text-muted">
              <Link to={`${rbacBase}/roles`}>Roles</Link>
              <span className="mx-2">·</span>
              <Link to={`${rbacBase}/permissions`}>Role permissions</Link>
            </div>
          </div>

          {canAdd && (
            <form className="row g-2 align-items-end mb-4" onSubmit={onCreate}>
              <div className="col-12 col-md-8 col-lg-6">
                <label className="form-label small text-muted mb-1">New module name</label>
                <input
                  className="form-control form-control-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. product"
                />
              </div>
              <div className="col-auto">
                <button type="submit" className="btn btn-primary btn-sm">
                  Add module
                </button>
              </div>
            </form>
          )}

          <div className="d-flex flex-column gap-3 mb-3">
            <div className="d-flex flex-column flex-xl-row flex-xl-nowrap align-items-stretch align-items-xl-end gap-3">
              <div className="flex-shrink-0">
                <label htmlFor="module-rows-limit" className="form-label small text-muted mb-1">
                  Rows per page
                </label>
                <select
                  id="module-rows-limit"
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
                <label htmlFor="module-search" className="form-label small text-muted mb-1">
                  Search
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0 py-1" id="module-search-addon">
                    <FaSearch className="text-secondary" size={14} aria-hidden />
                  </span>
                  <input
                    id="module-search"
                    type="search"
                    className="form-control border-start-0"
                    placeholder="Module name…"
                    aria-describedby="module-search-addon"
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
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => void onDelete(row)}
                            >
                              Delete
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
                      No modules found
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
            aria-labelledby="edit-module-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={onSaveEdit}>
                  <div className="modal-header">
                    <h2 className="modal-title fs-5" id="edit-module-title">
                      Edit module
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

export default ManageModulesPage;
