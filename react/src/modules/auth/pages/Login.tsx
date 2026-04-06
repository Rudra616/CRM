import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginApi, adminLoginApi, logoutApi, logoutAdminApi } from '../api/auth.api';
import { clearClientAuthStorage } from '../../../shared/utils/authSession';
import { validateLoginFields } from '../../../shared/utils/validation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import { showError, showSuccess,showInfo } from '../../../shared/utils/toast';
import { AuthPageLayout, authLinkStyle } from '../../../shared/components/AuthPageLayout';
import type { Admin, User, UserInfo } from '../../../shared/types/common.types';
const toUserInfo = (u: User | Admin): UserInfo => ({
  id: Number(u.id),
  username: u.username,
  email: u.email,
  role: u.role,
  firstname: 'firstname' in u ? (u.firstname ?? '') : '',
  lastname: 'lastname' in u ? (u.lastname ?? '') : '',
  phone: 'phone' in u ? (u.phone ?? '') : '',
});

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const isAdminRoute =
    location.pathname === '/admin' || location.pathname === '/admin/login';
  const sessionMsgShown = useRef(false);

  useEffect(() => {
    clearClientAuthStorage();
    const clearServerSession = isAdminRoute ? logoutAdminApi : logoutApi;
    void clearServerSession().catch(() => {});
  }, [isAdminRoute]);

  useEffect(() => {
    if (sessionMsgShown.current || searchParams.get('reason') !== 'session') return;
    sessionMsgShown.current = true;
    showInfo('Your session ended. Please sign in again.');
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
  }, [searchParams, navigate, location.pathname]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } = useFormValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const validation = validateLoginFields(username, password);
    if (Object.values(validation).some((r) => !r.valid)) {
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

      const apiUser = isAdminRoute
        ? (response.data as { admin?: Admin }).admin
        : (response.data as { user?: User }).user;

      if (!apiUser) {
        showError(response.message || 'Login failed');
        return;
      }

      login(toUserInfo(apiUser));

      showSuccess('Login successful');
      if (apiUser.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (apiUser.role === 'subadmin') navigate('/subadmin/dashboard', { replace: true });
      else navigate('/user/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Login failed';
      showError(msg.toLowerCase().includes('invalid') ? 'Wrong username or password' : msg);
    }
  };

  return (
    <AuthPageLayout
      title={isAdminRoute ? 'Admin sign in' : 'Sign in'}
      subtitle={
        isAdminRoute
          ? 'Administrator access'
          : ''
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-medium">Username</label>
          <input
            type="text"
            className={`form-control ${errors.username ? 'is-invalid' : ''}`}
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              clearFieldError('username');
            }}
            placeholder="Username"
          />
          {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
        </div>
        <div className="mb-4">
          <label className="form-label fw-medium">Password</label>
          <input
            type="password"
            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError('password');
            }}
            placeholder="Password"
          />
          {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
        </div>
        <button type="submit" className="btn btn-primary w-100 mb-2">
          {isAdminRoute ? 'Sign in as admin' : 'Sign in'}
        </button>
        {!isAdminRoute && (
          <div className="text-center small text-muted mt-3">
            <div className="mb-2">
              <span>No account? </span>
              <Link to="/register" style={authLinkStyle}>
                Register
              </Link>
            </div>
            <Link to="/forgot-password" style={authLinkStyle}>
              Forgot password?
            </Link>
          </div>
        )}
      </form>
    </AuthPageLayout>
  );
};

export default Login;
