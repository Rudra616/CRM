import React, { useEffect, useState } from 'react';
import { validateEditUserFields } from '../utils/validation';
import { useFormValidation } from '../hooks/useFormValidation';
import type { User, Gender } from '../types/common.types';

type EditUserForm = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  gender: Gender;
};

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (data: {
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    password?: string;
    gender: Gender;
  }) => Promise<void>;
  title: string;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSave,
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
    password: '',
    gender: 'other',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username ?? '',
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        password: '',
        gender: (user.gender ?? 'other') as Gender,
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
    resetErrors();

    const payload = {
      username: form.username.trim(),
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      email: form.email.trim(),
      phone: form.phone.replace(/\D/g, '').slice(0, 10),
      password: form.password.trim() || undefined,
      gender: form.gender,
    };

    const fieldResults = validateEditUserFields(payload);
    const hasErrors = Object.values(fieldResults).some((r) => !r.valid);
    if (hasErrors) {
      setErrorsFromValidation(fieldResults);
      return;
    }

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      // API error shown by parent via toast
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
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gender: e.target.value as Gender }))
                  }
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">New Password (optional)</label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                />
                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};