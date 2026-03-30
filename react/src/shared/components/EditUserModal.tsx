import React, { useEffect, useState } from 'react';
import { validateEditUserFields, validateOptionalNewPasswordPair } from '../utils/validation';
import { useFormValidation } from '../hooks/useFormValidation';
import { showError } from '../utils/toast';
import type { User, Gender } from '../types/common.types';

type EditUserForm = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: Gender;
  newPassword: string;
  confirmPassword: string;
};

export type EditUserProfilePayload = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: Gender;
};

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (data: EditUserProfilePayload) => Promise<void>;
  /** When set, shows optional new + confirm password; only calls this if user entered a new password. */
  onChangePassword?: (body: { newPassword: string; confirmPassword: string }) => Promise<void>;
  title: string;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSave,
  onChangePassword,
  title,
}) => {
  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } =
    useFormValidation<EditUserForm>();
  const [form, setForm] = useState<EditUserForm>({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    gender: 'other',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const enablePasswordChange = Boolean(onChangePassword);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username ?? '',
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        gender: (user.gender ?? 'other') as Gender,
        newPassword: '',
        confirmPassword: '',
      });
      resetErrors();
    }
  }, [user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    clearFieldError(name as keyof EditUserForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    resetErrors();

    const profilePayload: EditUserProfilePayload = {
      username: form.username.trim(),
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      email: form.email.trim(),
      phone: form.phone.replace(/\D/g, '').slice(0, 10),
      gender: form.gender,
    };

    const np = form.newPassword.trim();
    const cp = form.confirmPassword.trim();
    const wantsPw = np.length > 0 || cp.length > 0;

    const profileChanged =
      profilePayload.username !== (user.username ?? '') ||
      profilePayload.firstname !== (user.firstname ?? '') ||
      profilePayload.lastname !== (user.lastname ?? '') ||
      profilePayload.email !== (user.email ?? '') ||
      profilePayload.phone !== (user.phone ?? '').replace(/\D/g, '').slice(0, 10) ||
      profilePayload.gender !== (user.gender ?? 'other');

    const fieldResults: Record<string, { valid: boolean; message?: string }> = {
      ...validateEditUserFields(profilePayload),
    };
    if (enablePasswordChange && wantsPw) {
      Object.assign(fieldResults, validateOptionalNewPasswordPair(form.newPassword, form.confirmPassword));
    }
    const hasErrors = Object.values(fieldResults).some((r) => !r.valid);
    if (hasErrors) {
      setErrorsFromValidation(fieldResults);
      return;
    }

    if (!profileChanged && !wantsPw) {
      showError('No changes to save');
      return;
    }

    setSaving(true);
    try {
      if (profileChanged) {
        await onSave(profilePayload);
      }
      if (enablePasswordChange && wantsPw && onChangePassword) {
        await onChangePassword({ newPassword: np, confirmPassword: cp });
      }
      onClose();
    } catch {
      // Parent shows toast
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Min 3 characters"
                />
                {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">First Name *</label>
                <input
                  className={`form-control ${errors.firstname ? 'is-invalid' : ''}`}
                  name="firstname"
                  value={form.firstname}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      firstname: e.target.value.replace(/[^A-Za-z]/g, ''),
                    }));
                    clearFieldError('firstname');
                  }}
                  placeholder="Letters only"
                />
                {errors.firstname && <div className="invalid-feedback d-block">{errors.firstname}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Last Name *</label>
                <input
                  className={`form-control ${errors.lastname ? 'is-invalid' : ''}`}
                  name="lastname"
                  value={form.lastname}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      lastname: e.target.value.replace(/[^A-Za-z]/g, ''),
                    }));
                    clearFieldError('lastname');
                  }}
                  placeholder="Letters only"
                />
                {errors.lastname && <div className="invalid-feedback d-block">{errors.lastname}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="valid@email.com"
                />
                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Phone *</label>
                <input
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  name="phone"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10),
                    }));
                    clearFieldError('phone');
                  }}
                  placeholder="10 digits only"
                  maxLength={10}
                />
                {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Gender *</label>
                <select
                  className="form-select"
                  value={form.gender}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, gender: e.target.value as Gender }));
                    clearFieldError('gender');
                  }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
              </div>
              {enablePasswordChange && (
                <>
                  <hr className="my-3" />
                  <p className="small text-muted mb-2">Leave blank to keep the current password.</p>
                  <div className="mb-2">
                    <label className="form-label">New password</label>
                    <input
                      type="password"
                      className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="Only if changing password"
                    />
                    {errors.newPassword && (
                      <div className="invalid-feedback d-block">{errors.newPassword}</div>
                    )}
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Confirm new password</label>
                    <input
                      type="password"
                      className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter new password"
                    />
                    {errors.confirmPassword && (
                      <div className="invalid-feedback d-block">{errors.confirmPassword}</div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
