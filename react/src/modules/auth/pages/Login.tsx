import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginApi, adminLoginApi, subadminLoginApi } from '../api/auth.api';
import { clearClientAuthStorage } from '../../../shared/utils/authSession';
import { validateLoginFields } from '../../../shared/utils/validation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import { showError, showSuccess, showInfo } from '../../../shared/utils/toast';
import { AuthPageLayout, authLinkStyle } from '../../../shared/components/AuthPageLayout';
import type { Admin, User, UserInfo } from '../../../shared/types/common.types';
import type { AdminLoginResponse, LoginResponse, SubadminLoginResponse } from '../types/auth.types';
import { MAIN_ADMIN_USERNAME } from '../../../shared/constants/adminAuth';
import { homePathForGate } from '../../../shared/utils/sessionGate';

const STAFF_LOGIN_PATHS = new Set(['/admin', '/admin/login']);

/** Backend login returns snake_case names; normalize for session storage. */
const memberFromUserApi = (u: User & Record<string, unknown>): UserInfo => ({
  id: Number(u.id),
  username: u.username,
  email: u.email,
  firstname:
    u.firstname ??
    (u.first_name as string | undefined) ??
    '',
  lastname:
    u.lastname ??
    (u.last_name as string | undefined) ??
    '',
  phone: u.phone ?? '',
  is_staff: false,
  is_main_admin: false,
  role_id: u.role_id ?? undefined,
});

const ownerFromAdminLogin = (u: Admin): UserInfo => ({
  id: Number(u.id),
  username: u.username,
  email: u.email,
  firstname: (u as unknown as { first_name?: string }).first_name ?? '',
  lastname: (u as unknown as { last_name?: string }).last_name ?? '',
  phone: (u as unknown as { phone?: string }).phone ?? '',
  is_staff: true,
  is_main_admin: true,
  role_id: u.role_id ?? null,
});

const delegateFromSubadminLogin = (
  u: SubadminLoginResponse['subadmin']
): UserInfo => ({
  id: Number(u.id),
  username: u.username,
  email: u.email,
  firstname: u.first_name ?? '',
  lastname: u.last_name ?? '',
  phone: '',
  is_staff: true,
  is_main_admin: false,
  role_id: Number(u.role_id) > 0 ? Number(u.role_id) : null,
});

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const isStaffLoginRoute = STAFF_LOGIN_PATHS.has(location.pathname);
  const isRegularUserLogin = location.pathname === '/login';
  const sessionMsgShown = useRef(false);

  useEffect(() => {
    clearClientAuthStorage();
  }, [isStaffLoginRoute, isRegularUserLogin]);

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
      const trimmedUser = username.trim();

      let session: UserInfo;

      if (isStaffLoginRoute) {
        const isMainAdminLogin =
          trimmedUser.toLowerCase() === MAIN_ADMIN_USERNAME.toLowerCase();
        if (isMainAdminLogin) {
          const response = await adminLoginApi(trimmedUser, password);
          if (!response.data) {
            showError(response.message || 'Login failed');
            return;
          }
          session = ownerFromAdminLogin((response.data as AdminLoginResponse).admin);
        } else {
          const response = await subadminLoginApi(trimmedUser, password);
          if (!response.data) {
            showError(response.message || 'Login failed');
            return;
          }
          session = delegateFromSubadminLogin(
            (response.data as SubadminLoginResponse).subadmin
          );
        }
      } else {
        const response = await loginApi(trimmedUser, password);
        if (!response.data) {
          showError(response.message || 'Login failed');
          return;
        }
        session = memberFromUserApi((response.data as LoginResponse).user);
      }

      login(session);

      showSuccess('Login successful');
      const gate = session.is_main_admin
        ? 'owner'
        : session.is_staff
          ? 'delegate'
          : 'member';
      navigate(homePathForGate(gate), { replace: true });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Login failed';
      showError(msg.toLowerCase().includes('invalid') ? 'Wrong username or password' : msg);
    }
  };

  return (
    <AuthPageLayout
      title={isStaffLoginRoute ? 'Staff sign in' : 'Sign in'}
      subtitle={
        isStaffLoginRoute
          ? 'Main administrator uses username “admin”; other staff sign in with their username.'
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
          Sign in
        </button>
        {!isStaffLoginRoute && (
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
