import { useEffect, useState } from 'react';
import { PageShell } from '../../../shared/components/PageShell';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';
import { validateRegister } from '../../../shared/utils/validation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { createSubadminApi } from '../../auth/api/auth.api';
import { getRolesApi, type RoleItem } from '../api/admin.api';
import type { Gender } from '../../../shared/types/common.types';

type CreateSubadminForm = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: Gender | '';
  roleId: number | '';
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM: CreateSubadminForm = {
  username: '',
  firstname: '',
  lastname: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  gender: '',
  roleId: '',
};

const CreateSubadminPage = () => {
  const { user } = useAuth();
  const { getModulePerm, permLoading } = usePermissions();
  const canCreateByRbac = getModulePerm(PERMISSION_MODULE_KEYS.SUBADMIN).can_add;
  const isDelegateStaff = Boolean(user?.is_staff && !user?.is_main_admin);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateSubadminForm>(EMPTY_FORM);
  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } =
    useFormValidation<CreateSubadminForm>();

  useEffect(() => {
    void getRolesApi()
      .then((res) => setRoles(res.data ?? []))
      .catch(() => setRoles([]));
  }, []);

  const canCreate = !isDelegateStaff || canCreateByRbac;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    resetErrors();

    if (!canCreate) {
      showError('You do not have permission to create subadmins');
      return;
    }

    const validation = validateRegister(
      {
        username: form.username,
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        password: form.password,
        confirmPassword: form.confirmPassword,
      },
      { requireConfirmPassword: true }
    );
    const hasErrors = Object.values(validation).some((v) => !v.valid);
    if (hasErrors) {
      setErrorsFromValidation(validation);
      return;
    }

    const roleId = Number(form.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      showError('Please select a role');
      return;
    }

    try {
      setSaving(true);
      await createSubadminApi({
        username: form.username,
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        phone: form.phone,
        password: form.password,
        gender: form.gender as Gender,
        role_id: roleId,
      });
      showSuccess('Subadmin created successfully');
      setForm(EMPTY_FORM);
      resetErrors();
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to create subadmin');
    } finally {
      setSaving(false);
    }
  };

  if (!permLoading && !canCreate) {
    return (
      <PageShell title="Create Subadmin" subtitle="Add a new subadmin account">
        <div className="p-3 p-md-4 text-muted">
          You do not have permission to create subadmins.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create Subadmin"
      subtitle="Create a staff account and assign a role"
      loading={permLoading}
      loadingMessage="Loading permissions..."
      flush
    >
      <div className="p-3 p-md-4">
        <form onSubmit={onSubmit} className="row g-3">
          <div className="col-12 col-lg-6">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className={`form-control ${errors.username ? 'is-invalid' : ''}`}
              value={form.username}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, username: e.target.value }));
                clearFieldError('username');
              }}
              placeholder="Min 3 characters"
              maxLength={50}
            />
            {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
          </div>

          <div className="col-12 col-lg-6">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                clearFieldError('email');
              }}
              placeholder="valid@email.com"
              maxLength={50}
            />
            {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">First Name *</label>
            <input
              className={`form-control ${errors.firstname ? 'is-invalid' : ''}`}
              value={form.firstname}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, firstname: e.target.value.replace(/[^A-Za-z]/g, '') }));
                clearFieldError('firstname');
              }}
              placeholder="Letters only"
              maxLength={50}
            />
            {errors.firstname && <div className="invalid-feedback d-block">{errors.firstname}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Last Name *</label>
            <input
              className={`form-control ${errors.lastname ? 'is-invalid' : ''}`}
              value={form.lastname}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, lastname: e.target.value.replace(/[^A-Za-z]/g, '') }));
                clearFieldError('lastname');
              }}
              placeholder="Letters only"
              maxLength={50}
            />
            {errors.lastname && <div className="invalid-feedback d-block">{errors.lastname}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Phone *</label>
            <input
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              value={form.phone}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10),
                }));
                clearFieldError('phone');
              }}
              placeholder="10 digits"
              maxLength={10}
            />
            {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Gender *</label>
            <select
              className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
              value={form.gender}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, gender: e.target.value as Gender }));
                clearFieldError('gender');
              }}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Role *</label>
            <select
              className="form-select"
              value={form.roleId === '' ? '' : String(form.roleId)}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, roleId: value === '' ? '' : Number(value) }));
              }}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <div className="form-text">This role controls what the subadmin can access.</div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={form.password}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, password: e.target.value }));
                clearFieldError('password');
              }}
              placeholder="Upper, lower, number, symbol"
              maxLength={256}
            />
            {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Confirm Password *</label>
            <input
              type="password"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              value={form.confirmPassword}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                clearFieldError('confirmPassword');
              }}
              placeholder="Must match password"
              maxLength={256}
            />
            {errors.confirmPassword && (
              <div className="invalid-feedback d-block">{errors.confirmPassword}</div>
            )}
          </div>

          <div className="col-12 d-flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Subadmin'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm(EMPTY_FORM);
                resetErrors();
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
};

export default CreateSubadminPage;
