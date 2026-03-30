import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../../shared/components/PageShell';
import { validateResetPasswordFields } from '../../../shared/utils/validation';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { changeUserPasswordApi } from '../api/user.api';
import { changeAdminPasswordApi } from '../../admin/api/admin.api';
import { useAuth } from '../../../context/AuthContext';
import { clearClientAuthStorage } from '../../../shared/utils/authSession';
import { authLinkStyle } from '../../../shared/components/AuthPageLayout';

const ChangePassword = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateResetPasswordFields(newPassword, confirmPassword);
    const next: typeof errors = {};
    if (v.newPassword && !v.newPassword.valid) next.newPassword = v.newPassword.message;
    if (v.confirmPassword && !v.confirmPassword.valid) next.confirmPassword = v.confirmPassword.message;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const body = { newPassword, confirmPassword };
      if (isAdmin) await changeAdminPasswordApi(body);
      else await changeUserPasswordApi(body);
      showSuccess('Password updated. Please sign in again.');
      clearClientAuthStorage();
      window.location.replace(isAdmin ? '/admin/login?reason=session' : '/login?reason=session');
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const backHref = isAdmin ? '/admin/profile' : '/profile';

  return (
    <PageShell
      title="Change password"
      subtitle="After a successful change you will be signed out and must log in again."
    >
      <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: 440 }}>
        <div className="mb-3">
          <label className="form-label fw-medium">New password</label>
          <input
            type="password"
            className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((p) => ({ ...p, newPassword: undefined }));
            }}
            placeholder="Uppercase, lowercase, number, symbol"
            maxLength={256}
          />
          {errors.newPassword && <div className="invalid-feedback d-block">{errors.newPassword}</div>}
        </div>
        <div className="mb-4">
          <label className="form-label fw-medium">Confirm new password</label>
          <input
            type="password"
            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            placeholder="Re-enter new password"
            maxLength={256}
          />
          {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
        </div>
        <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
        <div className="text-center small">
          <Link to={backHref} style={authLinkStyle}>
            Back to profile
          </Link>
        </div>
      </form>
    </PageShell>
  );
};

export default ChangePassword;
