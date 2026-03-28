import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgotPasswordApi } from '../api/auth.api';
import { AuthPageLayout, authLinkStyle } from '../../../shared/components/AuthPageLayout';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email);
      toast.success('Password reset email sent! Check your inbox.');
      setEmail('');
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Forgot password"
      subtitle="Enter your registered email — we will send a reset link (same style as dashboard pages)."
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-medium">Email</label>
          <input
            type="email"
            className={`form-control ${emailError ? 'is-invalid' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
          />
          {emailError && <div className="invalid-feedback d-block">{emailError}</div>}
        </div>

        <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>

        <div className="text-center mt-3 small text-muted">
          <span>Remember your password? </span>
          <Link to="/login" style={authLinkStyle}>
            Sign in
          </Link>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default ForgotPassword;
