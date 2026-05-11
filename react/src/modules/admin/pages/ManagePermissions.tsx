import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import {
  getModulesApi,
  getRolePermissionsApi,
  getRolesApi,
  type ModuleItem,
  type RoleItem,
  type RolePermissionEntry,
  type RolePermissionSaveRow,
  saveRolePermissionsApi,
} from '../api/admin.api';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';

type PermFlags = {
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

const flagFromDb = (v: unknown): boolean => v === 1 || v === true;

const emptyPerm = (): PermFlags => ({
  can_view: false,
  can_add: false,
  can_edit: false,
  can_delete: false,
});
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

const buildPermMap = (modules: ModuleItem[], rows: RolePermissionEntry[]): Record<number, PermFlags> => {
  const map = new Map(rows.map((p) => [p.module_id, p]));
  const out: Record<number, PermFlags> = {};
  for (const m of modules) {
    const p = map.get(m.id);
    out[m.id] = p
      ? {
          can_view: flagFromDb(p.can_view),
          can_add: flagFromDb(p.can_add),
          can_edit: flagFromDb(p.can_edit),
          can_delete: flagFromDb(p.can_delete),
        }
      : emptyPerm();
  }
  return out;
};

const ManagePermissions = () => {
  const { user } = useAuth();
  const { getModulePerm, permLoading } = usePermissions();
  const isOwner = user?.is_main_admin;
  const permRp = getModulePerm(PERMISSION_MODULE_KEYS.MODULE);
  const canViewMatrix = isOwner || permRp.can_view;
  const canEditMatrix = isOwner || permRp.can_edit;

  const rbacBase = '/admin/rbac';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permByModule, setPermByModule] = useState<Record<number, PermFlags>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );
  const filteredModules = useMemo(() => {
    const q = appliedSearchTerm.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q));
  }, [modules, appliedSearchTerm]);
  const totalModules = filteredModules.length;
  const totalPages = Math.max(1, Math.ceil(totalModules / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageModules = filteredModules.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const start = totalModules === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const end = Math.min(safePage * rowsPerPage, totalModules);

  const setFlag = (moduleId: number, key: keyof PermFlags, value: boolean) => {
    setPermByModule((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] ?? emptyPerm()),
        [key]: value,
      },
    }));
  };

  const loadBase = async () => {
    setLoading(true);
    try {
      const [rolesRes, modulesRes] = await Promise.all([getRolesApi(), getModulesApi()]);
      const nextRoles = rolesRes.data ?? [];
      const nextModules = modulesRes.data ?? [];

      setRoles(nextRoles);
      setModules(nextModules);

      const roleId = selectedRoleId ?? nextRoles[0]?.id ?? null;
      setSelectedRoleId(roleId);

      if (roleId) {
        const permsRes = await getRolePermissionsApi(roleId);
        setPermByModule(buildPermMap(nextModules, permsRes.data?.permissions ?? []));
      } else {
        setPermByModule(buildPermMap(nextModules, []));
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permLoading) return;
    if (!canViewMatrix) {
      setLoading(false);
      return;
    }
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permLoading, canViewMatrix]);

  const loadPermissionsForRole = async (roleId: number, moduleList: ModuleItem[]) => {
    try {
      const res = await getRolePermissionsApi(roleId);
      setPermByModule(buildPermMap(moduleList, res.data?.permissions ?? []));
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load role modules');
      setPermByModule(buildPermMap(moduleList, []));
    }
  };

  const onRoleChange = async (value: string) => {
    const roleId = Number(value);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      setSelectedRoleId(null);
      setPermByModule(buildPermMap(modules, []));
      return;
    }
    setSelectedRoleId(roleId);
    await loadPermissionsForRole(roleId, modules);
  };

  const onSavePermissions = async () => {
    if (!canEditMatrix) {
      showError('You do not have permission to edit role permissions');
      return;
    }
    if (!selectedRoleId) {
      showError('Select a role first');
      return;
    }

    const permissions: RolePermissionSaveRow[] = modules.map((m) => {
      const p = permByModule[m.id] ?? emptyPerm();
      return {
        module_id: m.id,
        can_view: p.can_view,
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      };
    });

    setSaving(true);
    try {
      await saveRolePermissionsApi(selectedRoleId, permissions);
      showSuccess('Role permissions saved');
      await loadPermissionsForRole(selectedRoleId, modules);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  };

  if (!permLoading && !canViewMatrix) {
    return (
      <PageShell title="Role Permissions" subtitle="Assign permissions per role and module">
        <div className="p-4 text-muted">You do not have permission to view role permissions.</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Role Permissions"
      subtitle="Set view / add / edit / delete per module for each role"
      loading={permLoading || loading}
      loadingMessage="Loading permissions..."
      flush
    >
      <div className="p-3 p-md-4">
        <div className="alert alert-light border mb-3 small mb-4">
          Add or rename modules and roles on the dedicated pages:{' '}
          <Link to={`${rbacBase}/modules`}>Modules</Link>
          <span className="mx-1">·</span>
          <Link to={`${rbacBase}/roles`}>Roles</Link>.
        </div>

        <div className="card mt-0">
          <div className="card-header fw-semibold">Permissions by module</div>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={selectedRoleId ?? ''}
                  onChange={(e) => void onRoleChange(e.target.value)}
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6 text-md-end">
                <button
                  className="btn btn-success"
                  type="button"
                  onClick={onSavePermissions}
                  disabled={!selectedRoleId || saving || !canEditMatrix}
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>

            <hr />

            <div className="mb-2 text-muted small">
              Selected role: <span className="text-dark fw-semibold">{selectedRole?.name ?? '-'}</span>
            </div>

            <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-2 mb-3">
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div className="flex-shrink-0">
                  <label htmlFor="perm-rows-limit" className="form-label small text-muted mb-1">
                    Rows per page
                  </label>
                  <select
                    id="perm-rows-limit"
                    className="form-select form-select-sm"
                    style={{ minWidth: 88 }}
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-muted small ms-lg-1">
                  Total <span className="fw-semibold text-dark">{totalModules}</span>
                </div>
              </div>

                <div style={{ width: 'min(340px, 100%)' }}>
                  <label htmlFor="perm-search" className="form-label small text-muted mb-1">
                    Search
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0 py-1" id="perm-search-addon">
                      <FaSearch className="text-secondary" size={14} aria-hidden />
                    </span>
                    <input
                      id="perm-search"
                      type="search"
                      className="form-control border-start-0"
                      placeholder="Module name or id…"
                      aria-describedby="perm-search-addon"
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
                      className="btn btn-primary px-2"
                      title="Search"
                      aria-label="Search"
                      onClick={() => {
                        setCurrentPage(1);
                        setAppliedSearchTerm(searchTerm.trim());
                      }}
                    >
                      <FaSearch size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-2"
                      title="Clear search"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                        setAppliedSearchTerm('');
                      }}
                    >
                      <FaTimes size={14} aria-hidden />
                    </button>
                  </div>
              </div>
            </div>

            {modules.length === 0 ? (
              <div className="text-muted">No modules found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Module</th>
                      <th className="text-center">View</th>
                      <th className="text-center">Add</th>
                      <th className="text-center">Edit</th>
                      <th className="text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageModules.map((m) => {
                      const p = permByModule[m.id] ?? emptyPerm();
                      return (
                        <tr key={m.id}>
                          <td>
                            <span className="fw-semibold">{m.name}</span>
                            <span className="d-block text-muted small">id {m.id}</span>
                          </td>
                          {(['can_view', 'can_add', 'can_edit', 'can_delete'] as const).map((key) => (
                            <td key={key} className="text-center">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={p[key]}
                                disabled={!canEditMatrix}
                                onChange={(e) => setFlag(m.id, key, e.target.checked)}
                                aria-label={`${m.name} ${key}`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {totalModules > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <div className="text-muted small">
                  {start}–{end} of {totalModules}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </button>
                  <span className="small text-muted">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ManagePermissions;
