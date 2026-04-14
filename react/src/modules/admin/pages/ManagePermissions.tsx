import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createModuleApi,
  createRoleApi,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permByModule, setPermByModule] = useState<Record<number, PermFlags>>({});

  const [moduleName, setModuleName] = useState('');
  const [roleName, setRoleName] = useState('');

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

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
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onCreateModule = async (e: FormEvent) => {
    e.preventDefault();
    const name = moduleName.trim();
    if (!name) {
      showError('Module name is required');
      return;
    }

    try {
      await createModuleApi({ name });
      setModuleName('');
      showSuccess('Module created');
      await loadBase();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to create module');
    }
  };

  const onCreateRole = async (e: FormEvent) => {
    e.preventDefault();
    const name = roleName.trim().toLowerCase();
    if (!name) {
      showError('Role name is required');
      return;
    }

    try {
      await createRoleApi({ name });
      setRoleName('');
      showSuccess('Role created');
      await loadBase();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to create role');
    }
  };

  const onSavePermissions = async () => {
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

  return (
    <PageShell
      title="Role Permissions"
      subtitle="Create modules and roles, then set view / add / edit / delete per module"
      loading={loading}
      loadingMessage="Loading permissions..."
      flush
    >
      <div className="p-3 p-md-4">
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header fw-semibold">Create Module</div>
              <div className="card-body">
                <form className="row g-2" onSubmit={onCreateModule}>
                  <div className="col-12">
                    <input
                      className="form-control"
                      placeholder="Module name (shown in UI)"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" type="submit">
                      Add Module
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-header fw-semibold">Create Role</div>
              <div className="card-body">
                <form className="row g-2" onSubmit={onCreateRole}>
                  <div className="col-12">
                    <input
                      className="form-control"
                      placeholder="Role name (example: support)"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" type="submit">
                      Add Role
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-3">
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
                  disabled={!selectedRoleId || saving}
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>

            <hr />

            <div className="mb-2 text-muted small">
              Selected role: <span className="text-dark fw-semibold">{selectedRole?.name ?? '-'}</span>
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
                    {modules.map((m) => {
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
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ManagePermissions;
