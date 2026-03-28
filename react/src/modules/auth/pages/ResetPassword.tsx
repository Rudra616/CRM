import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyResetTokenApi, resetPasswordApi } from '../api/auth.api';
import { validateResetPasswordFields } from '../../../shared/utils/validation';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { AuthPageLayout, authLinkStyle } from '../../../shared/components/AuthPageLayout';

type TokenStatus = 'checking' | 'valid' | 'expired' | 'used' | 'invalid';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }

    verifyResetTokenApi(token)
      .then(() => setTokenStatus('valid'))
      .catch((err: { message?: string }) => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('expired')) setTokenStatus('expired');
        else if (msg.includes('already') || msg.includes('used')) setTokenStatus('used');
        else setTokenStatus('invalid');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const fieldResults = validateResetPasswordFields(newPassword, confirmPassword);
    const validationErrors: typeof errors = {};
    if (fieldResults.newPassword && !fieldResults.newPassword.valid) {
      validationErrors.newPassword = fieldResults.newPassword.message;
    }
    if (fieldResults.confirmPassword && !fieldResults.confirmPassword.valid) {
      validationErrors.confirmPassword = fieldResults.confirmPassword.message;
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await resetPasswordApi(token, newPassword);
      showSuccess('Password reset successful. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to reset password.';
      showError(msg);
      const lower = msg.toLowerCase();
      if (lower.includes('already') || lower.includes('used')) setTokenStatus('used');
      else if (lower.includes('expired')) setTokenStatus('expired');
    } finally {
      setLoading(false);
    }
  };

  if (tokenStatus === 'checking') {
    return (
      <AuthPageLayout title="Verifying link" subtitle="Checking your reset link is valid.">
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted small mb-0">Verifying reset link…</p>
        </div>
      </AuthPageLayout>
    );
  }

  if (tokenStatus === 'used') {
    return (
      <AuthPageLayout title="Link already used" subtitle="Each reset link works only once.">
        <div className="text-center py-2">
          <div className="mb-3 fs-1">🔒</div>
          <p className="text-muted small mb-4">
            Request a new link below, then sign in from the login page.
          </p>
          <Link to="/forgot-password" className="btn btn-primary w-100 mb-2">
            Request new reset link
          </Link>
          <div className="small text-muted">
            <Link to="/login" style={authLinkStyle}>
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthPageLayout>
    );
  }

  if (tokenStatus === 'expired') {
    return (
      <AuthPageLayout title="Link expired or used" subtitle="Reset links are valid for 1 hour only.">
        <div className="text-center py-2">
          <div className="mb-3 fs-1">⏱</div>
          <p className="text-muted small mb-4">
            This link may have expired or already been used. Request a new one to continue.
          </p>
          <Link to="/forgot-password" className="btn btn-primary w-100 mb-2">
            Request new reset link
          </Link>
          <div className="small text-muted">
            <Link to="/login" style={authLinkStyle}>
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthPageLayout>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <AuthPageLayout title="Invalid reset link" subtitle="The link is missing, invalid, or was changed.">
        <div className="text-center py-2">
          <div className="mb-3 fs-1">⚠️</div>
          <p className="text-muted small mb-4">Request a fresh password reset from the forgot password page.</p>
          <Link to="/forgot-password" className="btn btn-primary w-100 mb-2">
            Request new reset link
          </Link>
          <div className="small text-muted">
            <Link to="/login" style={authLinkStyle}>
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="Reset password"
      subtitle="Same rules as registration: 8+ characters with uppercase, lowercase, number, and symbol."
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-medium">New password</label>
          <input
            type="password"
            className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
            placeholder="Min 8 characters, mixed case, number, symbol"
            value={newPassword}
            // minLength={8}
            maxLength={256}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((p) => ({ ...p, newPassword: undefined }));
            }}
          />
          {errors.newPassword && <div className="invalid-feedback d-block">{errors.newPassword}</div>}
        </div>

        <div className="mb-4">
          <label className="form-label fw-medium">Confirm password</label>
          <input
            type="password"
            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            placeholder="Re-enter new password"
            value={confirmPassword}
            // minLength={8}
            maxLength={256}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
          />
          {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
        </div>

        <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </button>

        <div className="text-center mt-3 small text-muted">
          <Link to="/login" style={authLinkStyle}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default ResetPassword;
