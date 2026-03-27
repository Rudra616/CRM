import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { registerApi, createSubadminApi } from '../api/auth.api';
import { validateRegister } from '../../../shared/utils/validation';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import { useAuth } from '../../../context/AuthContext';
import type { Gender } from '../../../shared/types/common.types';
import { colors } from '../../../theme/colors';

type RegisterForm = {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: Gender;
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const isCreateSubadmin = location.pathname === '/admin/create-subadmin';

  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } = useFormValidation<RegisterForm>();

  const [form, setForm] = useState<RegisterForm>({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '' as Gender,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name as keyof RegisterForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const validationResults = validateRegister(form);
    const hasErrors = Object.values(validationResults).some((r) => !r.valid);
    if (hasErrors) {
      setErrorsFromValidation(validationResults);
      return;
    }

    try {
      if (isCreateSubadmin) {
        await createSubadminApi({
          username: form.username,
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          password: form.password,
          gender: form.gender,
        });
        showSuccess('Subadmin created successfully');
        setForm({
          username: '',
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          gender: 'other',
        });
      } else {
        const response = await registerApi({
          username: form.username,
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          password: form.password,
          gender: form.gender,
        });

        const { user } = response.data || {};
        if (user) {
          login(user);
          showSuccess('User registered successfully');
          navigate('/user/dashboard', { replace: true });
        } else {
          showSuccess('User registered successfully. Please sign in.');
          navigate('/login', { replace: true });
        }
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      showError(isCreateSubadmin ? (msg ?? 'Failed to create subadmin') : (msg ?? 'Registration failed'));
    }
  };

  const wrapperStyle = isCreateSubadmin ? { paddingBottom: '2rem' } : { minHeight: '100vh', alignItems: 'center', paddingBottom: '2rem' };

  return (
    <div className="container my-5 mx-auto d-flex justify-content-center" style={wrapperStyle}>
      <div className="card shadow-sm mx-auto" style={{ borderWidth: 2, maxWidth: 450, width: '100%' }}>
        <div className="card-body p-4">
          <h3 className="mb-4" style={{ color: colors.primary }}>
            {isCreateSubadmin ? 'Create Subadmin' : 'Register'}
          </h3>
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-3">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                name="username"
                placeholder="Min 3 characters"
                value={form.username}
                onChange={handleChange}
                minLength={3}
                maxLength={50}
              />
              {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
            </div>

            {/* First Name */}
            <div className="mb-3">
              <label className="form-label">First Name *</label>
              <input
                className={`form-control ${errors.firstname ? 'is-invalid' : ''}`}
                name="firstname"
                value={form.firstname}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    firstname: e.target.value.replace(/[^A-Za-z]/g, ''),
                  }));
                  clearFieldError('firstname');
                }}
                placeholder="Letters only"
                maxLength={50}
              />
              {errors.firstname && <div className="invalid-feedback d-block">{errors.firstname}</div>}
            </div>

            {/* Last Name */}
            <div className="mb-3">
              <label className="form-label">Last Name *</label>
              <input
                className={`form-control ${errors.lastname ? 'is-invalid' : ''}`}
                name="lastname"
                value={form.lastname}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    lastname: e.target.value.replace(/[^A-Za-z]/g, ''),
                  }));
                  clearFieldError('lastname');
                }}
                placeholder="Letters only"
                maxLength={50}
              />
              {errors.lastname && <div className="invalid-feedback d-block">{errors.lastname}</div>}
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                name="email"
                placeholder="valid@email.com"
                value={form.email}
                onChange={handleChange}
                maxLength={50}
              />
              {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
            </div>

            {/* Phone */}
            <div className="mb-3">
              <label className="form-label">Phone *</label>
              <input
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                name="phone"
                value={form.phone}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10),
                  }));
                  clearFieldError('phone');
                }}
                placeholder="10 digits only"
                maxLength={10}
              />
              {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
            </div>

            {/* Gender */}
            <div className="mb-3">
              <label className="form-label">Gender *</label>
              <select
                className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
                value={form.gender}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, gender: e.target.value as Gender }));
                  clearFieldError('gender');
                }}
              >
                <option value="">----- Select -----</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                name="password"
                placeholder="Uppercase, lowercase, number, symbol"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                maxLength={256}
              />
              {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                name="confirmPassword"
                placeholder="Must match password"
                value={form.confirmPassword}
                onChange={handleChange}
                minLength={8}
                maxLength={256}
              />
              {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
            </div>

            <button
              type="submit"
              className="btn w-100 mb-2"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              {isCreateSubadmin ? 'Create Subadmin' : 'Sign Up'}
            </button>

            {isCreateSubadmin ? (
              <Link to="/admin/subadmins" className="btn btn-outline-secondary w-100">
                Back to Subadmins
              </Link>
            ) : (
              <div className="text-center mt-3">
                <span>Already have an account? </span>
                <Link to="/login">Sign In</Link>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;