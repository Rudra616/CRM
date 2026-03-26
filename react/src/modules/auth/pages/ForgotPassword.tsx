import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgotPasswordApi } from '../api/auth.api';

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 mx-auto d-flex justify-content-center" style={{ height: '100vh', alignItems: 'center' }}>
      <div className="card shadow-sm mx-auto" style={{ borderWidth: 2, maxWidth: 400, width: '100%' }}>
        <div className="card-body p-4">
          <h3 className="mb-1 text-primary">Forgot Password</h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
            Enter your registered email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email Address *</label>
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
                'Send Reset Link'
              )}
            </button>

            <div className="text-center mt-3">
              <span>Remember your password? </span>
              <Link to="/login">Sign In</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;