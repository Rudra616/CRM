import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createModuleApi,
  createRoleApi,
  getModulesApi,
  getRolePermissionsApi,
  getRolesApi,
  type ModuleItem,
  type RoleItem,
  saveRolePermissionsApi,
} from "../api/admin.api";
import { PageShell } from "../../../shared/components/PageShell";
import { showError, showSuccess } from "../../../shared/utils/toast";

const ManagePermissions = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);

  const [moduleKey, setModuleKey] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [roleName, setRoleName] = useState("");

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

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
        setSelectedModuleIds(permsRes.data?.moduleIds ?? []);
      } else {
        setSelectedModuleIds([]);
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissionsForRole = async (roleId: number) => {
    try {
      const res = await getRolePermissionsApi(roleId);
      setSelectedModuleIds(res.data?.moduleIds ?? []);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to load role modules");
      setSelectedModuleIds([]);
    }
  };

  const onRoleChange = async (value: string) => {
    const roleId = Number(value);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      setSelectedRoleId(null);
      setSelectedModuleIds([]);
      return;
    }
    setSelectedRoleId(roleId);
    await loadPermissionsForRole(roleId);
  };

  const onToggleModule = (moduleId: number) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const onCreateModule = async (e: FormEvent) => {
    e.preventDefault();
    const key = moduleKey.trim();
    const name = moduleName.trim();
    if (!key || !name) {
      showError("Module key and name are required");
      return;
    }

    try {
      await createModuleApi({ key, name });
      setModuleKey("");
      setModuleName("");
      showSuccess("Module created");
      await loadBase();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to create module");
    }
  };

  const onCreateRole = async (e: FormEvent) => {
    e.preventDefault();
    const name = roleName.trim().toLowerCase();
    if (!name) {
      showError("Role name is required");
      return;
    }

    try {
      await createRoleApi({ name });
      setRoleName("");
      showSuccess("Role created");
      await loadBase();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to create role");
    }
  };

  const onSavePermissions = async () => {
    if (!selectedRoleId) {
      showError("Select a role first");
      return;
    }
    const cleanModuleIds = [...new Set(
      selectedModuleIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];

    setSaving(true);
    try {
      await saveRolePermissionsApi(selectedRoleId, cleanModuleIds);
      showSuccess("Role permissions saved");
      await loadPermissionsForRole(selectedRoleId);
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || "Failed to save role permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Role Permissions"
      subtitle="Create modules/roles and assign modules to each role"
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
                      placeholder="Module key (example: user_status_update)"
                      value={moduleKey}
                      onChange={(e) => setModuleKey(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <input
                      className="form-control"
                      placeholder="Module name"
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
                      placeholder="Role name (example: subadmin)"
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
          <div className="card-header fw-semibold">Assign Modules to Role</div>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={selectedRoleId ?? ""}
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
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>

            <hr />

            <div className="mb-2 text-muted small">
              Selected role: <span className="text-dark fw-semibold">{selectedRole?.name ?? "-"}</span>
            </div>

            {modules.length === 0 ? (
              <div className="text-muted">No modules found.</div>
            ) : (
              <div className="row g-2">
                {modules.map((m) => (
                  <div key={m.id} className="col-12 col-md-6 col-lg-4">
                    <label className="form-check d-flex align-items-center gap-2 border rounded p-2">
                      <input
                        type="checkbox"
                        className="form-check-input m-0"
                        checked={selectedModuleIds.includes(m.id)}
                        onChange={() => onToggleModule(m.id)}
                      />
                      <span className="small">
                        <span className="fw-semibold">{m.name}</span>
                        <span className="d-block text-muted">{m.key}</span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ManagePermissions;
