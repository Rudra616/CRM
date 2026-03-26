import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getProfileApi, updateProfileWithImageApi, getAdminProfileApi, updateAdminProfileWithImageApi } from '../api/user.api';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { validateProfileFields, validateAdminProfileFields } from '../../../shared/utils/validation';
import { validateProfileImage } from '../../../shared/utils/imageValidation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import type { User, Admin, Gender } from '../../../shared/types/common.types';
import { roleIdToRole, type RoleString } from '../../../shared/utils/roleUtils';
import { colors } from '../../../theme/colors';

const API_BASE = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';

type ProfileData = (User & { role?: string }) | (Admin & { role?: string });
type ProfileFormKeys =
  | 'username'
  | 'firstname'
  | 'lastname'
  | 'email'
  | 'phone'
  | 'password'
  | 'newPassword'
  | 'confirmPassword'
  | 'gender';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const forceLogout = (role: RoleString) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = role === 'admin' ? '/admin' : '/login';
};

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = roleIdToRole(user?.role);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin && location.pathname === '/profile') {
      navigate('/admin/profile', { replace: true });
    }
  }, [isAdmin, location.pathname, navigate]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { errors, setErrorsFromValidation, clearFieldError, resetErrors } =
    useFormValidation<Record<ProfileFormKeys, string>>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [gender, setGender] = useState<Gender | ''>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      if (isAdmin) {
        const res = await getAdminProfileApi();
        if (res.data) setProfile({ ...res.data, role: 'admin' });
      } else {
        const res = await getProfileApi();
        if (res.data) {
          const d = res.data as User & { role_id?: number };
          const profileRole = roleIdToRole(d.role ?? d.role_id);
          setProfile({
            ...res.data,
            role: profileRole,
            username: res.data.username ?? '',
            firstname: res.data.firstname ?? '',
            lastname: res.data.lastname ?? '',
            email: res.data.email ?? '',
            phone: res.data.phone ?? '',
          });
          setGender((res.data.gender as Gender) ?? 'other');
        }
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [isAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    clearFieldError(name as ProfileFormKeys);
    if (name === 'firstname' || name === 'lastname') {
      setProfile({ ...profile, [name]: value.replace(/[^A-Za-z]/g, '') });
    } else if (name === 'phone') {
      setProfile({
        ...profile,
        [name]: value.replace(/[^0-9]/g, '').slice(0, 10),
      });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateProfileImage(file);
    if (!validation.valid) {
      showError(validation.message ?? 'Invalid image');
      return;
    }
    setProfileImage(file);
    e.target.value = '';
  };

  const imageUrl = profile?.image_url
    ? profile.image_url.startsWith('http')
      ? profile.image_url
      : `${API_BASE}${profile.image_url}`
    : null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || updating) return;
    resetErrors();

    if (isAdmin) {
      const payload = {
        username: String(profile.username ?? '').trim(),
        email: String(profile.email ?? '').trim(),
        password: adminPassword.trim() || undefined,
      };
      const fieldResults = validateAdminProfileFields(payload);
      const hasError = Object.values(fieldResults).some((r) => !r.valid);
      if (hasError) {
        setErrorsFromValidation(fieldResults);
        return;
      }

      setUpdating(true);
      try {
        const res = await updateAdminProfileWithImageApi(payload, profileImage ?? undefined);
        if (res.data) {
          setProfile({ ...profile, ...res.data });
          // Update auth context? Not necessary for admin? We'll update user in context
          // but admin doesn't have a user object in auth context? Actually we can update.
          // For simplicity, we can just logout if password changed.
        }
        showSuccess('Profile updated successfully');
        setProfileImage(null);
        if (adminPassword.trim().length > 0) {
          showSuccess('Password changed. Please log in again.');
          forceLogout('admin');
          return;
        }
      } catch (err: unknown) {
        showError((err as { message?: string })?.message || 'Update failed');
      } finally {
        setUpdating(false);
      }
      return;
    }

    // USER / SUBADMIN
    const payload = {
      username: String(profile.username ?? '').trim(),
      firstname: String((profile as User).firstname ?? '').trim(),
      lastname: String((profile as User).lastname ?? '').trim(),
      email: String(profile.email ?? '').trim(),
      phone: String((profile as User).phone ?? '').replace(/\D/g, '').slice(0, 10),
      gender: (gender || undefined) as Gender | undefined,
      newPassword: userNewPassword.trim() || undefined,
      confirmPassword: confirmPassword.trim() || undefined,
    };
    const fieldResults = validateProfileFields(payload);
    const hasError = Object.values(fieldResults).some((r) => !r.valid);
    if (hasError) {
      setErrorsFromValidation(fieldResults);
      return;
    }

    setUpdating(true);
    try {
      const res = await updateProfileWithImageApi(payload, profileImage ?? undefined);
      if (res.data) {
        const d = res.data as User & { role_id?: number };
        const userRole = roleIdToRole(d.role ?? d.role_id);
        setProfile({ ...profile, ...res.data, role: userRole });
        setGender((res.data.gender as Gender) ?? gender);
        // Update auth context
        const updatedUser = {
          id: (res.data as User).id as number,
          username: res.data.username,
          role: userRole,
          firstname: res.data.firstname,
          lastname: res.data.lastname,
          email: res.data.email,
        };
        // Use context login to update? Actually we need to update localStorage too.
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // We'll simply refresh context? For now, we can reload or use context setter.
        // For simplicity, we can call logout and redirect if password changed.
      }
      showSuccess('Profile updated successfully');
      setProfileImage(null);
      if (userNewPassword.trim().length > 0) {
        showSuccess('Password changed. Please log in again.');
        forceLogout(role);
        return;
      }
    } catch (err: unknown) {
      showError((err as { message?: string })?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const ProfileImageBlock = () => (
    <div className="mb-4 d-flex flex-column align-items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleImageSelect}
        className="d-none"
      />
      {profileImage ? (
        <div className="position-relative">
          <img
            src={URL.createObjectURL(profileImage)}
            alt="Preview"
            onClick={() => window.open(URL.createObjectURL(profileImage), '_blank')}
            style={{
              width: 100,
              height: 100,
              objectFit: 'cover',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            style={styles.profileImageButton}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
        </div>
      ) : imageUrl ? (
        <div className="position-relative">
          <img
            src={imageUrl}
            alt="Profile"
            onClick={() => window.open(imageUrl, '_blank')}
            style={{
              width: 100,
              height: 100,
              objectFit: 'cover',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            style={styles.profileImageButton}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
        </div>
      ) : (
        <div className="position-relative">
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '40px',
              color: '#999',
              border: '2px solid #7e7e7e',
            }}
          >
            👤
          </div>
          <button
            type="button"
            style={styles.profileImageButton}
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="container mt-4">Loading...</div>;
  if (!profile) return <div className="container mt-4">Unable to load profile.</div>;

  if (isAdmin) {
    return (
      <div className="container mt-4 mx-auto" style={{ maxWidth: '500px' }}>
        <div className="card shadow-sm mx-auto" style={{ borderWidth: 2, maxWidth: 400, width: '100%' }}>
          <div className="card-body p-4">
            <h3 className="mb-4" style={{ color: colors.primary }}>Admin Profile</h3>
            <form onSubmit={handleUpdate}>
              <ProfileImageBlock />
              <div className="mb-2">
                <label className="form-label">Username *</label>
                <input
                  className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                  name="username"
                  value={profile.username ?? ''}
                  onChange={handleChange}
                  placeholder="Min 3 characters"
                />
                {errors.username && <div className="invalid-feedback d-block">{errors.username}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Email *</label>
                <input
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  type="email"
                  name="email"
                  value={profile.email ?? ''}
                  onChange={handleChange}
                  placeholder="valid@email.com"
                />
                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">New Password (optional)</label>
                <input
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  placeholder="Leave blank to keep current"
                />
                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                  placeholder="Re-enter new password"
                />
                {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
              </div>
              <button
                type="submit"
                className="btn w-100"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mx-auto" style={{ maxWidth: '500px' }}>
      <div className="card shadow-sm" style={{ borderWidth: 2 }}>
        <div className="card-body p-4">
          <h3 className="mb-4" style={{ color: colors.primary }}>My Profile</h3>
          <form onSubmit={handleUpdate}>
            <ProfileImageBlock />

            <div className="mb-2">
              <label className="form-label">Username *</label>
              <input
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                name="username"
                value={profile.username ?? ''}
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
                value={(profile as User).firstname ?? ''}
                onChange={handleChange}
                placeholder="Letters only"
              />
              {errors.firstname && <div className="invalid-feedback d-block">{errors.firstname}</div>}
            </div>

            <div className="mb-2">
              <label className="form-label">Last Name *</label>
              <input
                className={`form-control ${errors.lastname ? 'is-invalid' : ''}`}
                name="lastname"
                value={(profile as User).lastname ?? ''}
                onChange={handleChange}
                placeholder="Letters only"
              />
              {errors.lastname && <div className="invalid-feedback d-block">{errors.lastname}</div>}
            </div>

            <div className="mb-2">
              <label className="form-label">Email *</label>
              <input
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                type="email"
                name="email"
                value={profile.email ?? ''}
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
                value={(profile as User).phone ?? ''}
                onChange={handleChange}
                placeholder="10 digits only"
                maxLength={10}
              />
              {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
            </div>

            <div className="mb-2">
              <label className="form-label">Gender *</label>
              <select
                className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value as Gender);
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

            <div className="mb-3">
              <label className="form-label">New Password (optional)</label>
              <input
                className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                type="password"
                value={userNewPassword}
                onChange={(e) => {
                  setUserNewPassword(e.target.value);
                  clearFieldError('newPassword');
                }}
                placeholder="Leave blank to keep current password"
              />
              {errors.newPassword && <div className="invalid-feedback d-block">{errors.newPassword}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input
                className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError('confirmPassword');
                }}
                placeholder="Re-enter new password"
              />
              {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
            </div>
            <button
              type="submit"
              className="btn w-100"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

const styles: Record<string, React.CSSProperties> = {
  profileImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'orange',
    color: 'white',
    fontSize: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
};