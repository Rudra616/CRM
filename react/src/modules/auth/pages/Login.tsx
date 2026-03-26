import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginApi } from '../api/auth.api';
import { validateLoginFields } from '../../../shared/utils/validation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { colors } from '../../../theme/colors';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const isAdminRoute = location.pathname === '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } = useFormValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const validation = validateLoginFields(username, password);
    if (Object.values(validation).some(r => !r.valid)) {
      setErrorsFromValidation(validation);
      return;
    }

    try {
      const response = isAdminRoute
        ? await adminLoginApi(username, password)
        : await loginApi(username, password);

      if (!response.data) {
        showError(response.message);
        return;
      }

      const { token, user: apiUser } = response.data;
      login(token, apiUser);

      showSuccess('Login successful');
      if (apiUser.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (apiUser.role === 'subadmin') navigate('/subadmin/dashboard', { replace: true });
      else navigate('/user/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      showError(msg.includes('invalid') ? 'Wrong username or password' : msg);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <div className="card shadow-sm" style={{ borderWidth: 2, maxWidth: 400, width: '100%' }}>
        <div className="card-body p-4">
          <h3 className="mb-4" style={{ color: colors.primary }}>
            {isAdminRoute ? 'Admin Sign In' : 'Sign In'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearFieldError('username');
                }}
              />
              {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
              />
              {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
            </div>
            <button
              type="submit"
              className="btn w-100 mb-2"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              {isAdminRoute ? 'Admin Login' : 'Sign In'}
            </button>
            {!isAdminRoute && (
              <>
                <div className="text-center mt-1">
                  <span>Don't have an account? </span>
                  <Link to="/register">Sign Up</Link>
                </div>
                <div className="text-center">
                  <Link to="/forgot-password">Forgot Password?</Link>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;