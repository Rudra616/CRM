import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getProfileApi, updateProfileWithImageApi, getAdminProfileApi, updateAdminProfileWithImageApi } from '../api/user.api';
import { showSuccess, showError } from '../../../shared/utils/toast';
import { validateProfileFields, validateAdminProfileFields } from '../../../shared/utils/validation';
import { validateProfileImage } from '../../../shared/utils/imageValidation';
import { useFormValidation } from '../../../shared/hooks/useFormValidation';
import type { User, Admin, Gender } from '../../../shared/types/common.types';
import { roleIdToRole } from '../../../shared/utils/roleUtils';
import { PageShell } from '../../../shared/components/PageShell';
import { authLinkStyle } from '../../../shared/components/AuthPageLayout';
import { colors } from '../../../theme/colors';

const API_BASE = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';

const profileAvatarRing = `0 0 0 3px #fff, 0 0 0 5px ${colors.primary}` as const;

const profileFormPanelStyle: React.CSSProperties = {
  maxWidth: 440,
  marginLeft: 'auto',
  marginRight: 'auto',
  padding: '1.5rem',
  backgroundColor: colors.cardPrimaryBg,
  border: '1px solid rgba(13, 110, 253, 0.22)',
  borderLeft: `4px solid ${colors.primary}`,
  borderRadius: '0.5rem',
  boxShadow: '0 0.125rem 0.35rem rgba(13, 110, 253, 0.07)',
};

type ProfileData = (User & { role?: string }) | (Admin & { role?: string });
type ProfileFormKeys =
  | 'username'
  | 'firstname'
  | 'lastname'
  | 'email'
  | 'phone'
  | 'gender';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const role = user?.role;
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
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [gender, setGender] = useState<Gender | ''>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      if (isAdmin) {
        const res = await getAdminProfileApi();
        if (res.data) setProfile({ ...res.data, role: 'admin' });
      } else {
        const res = await getProfileApi();
        if (res.data) {
          const d = res.data as User & { role_id?: number };
          const userRole = roleIdToRole(d.role ?? d.role_id);

          setProfile({
            ...profile,
            ...res.data,
            role: userRole,
            image_url: res.data.image_url
              ? res.data.image_url + `?t=${Date.now()}`
              : res.data.image_url,
          });

          setGender((res.data.gender as Gender) ?? gender);

          login({
            id: Number((res.data as User).id),
            username: res.data.username,
            role: userRole,
            firstname: res.data.firstname ?? '',
            lastname: res.data.lastname ?? '',
            email: res.data.email,
            phone: (res.data as User).phone ?? '',
          });
        }

        setProfileImage(null);
        setImageFailed(false);
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

  // If image URL changes after an update, allow re-loading.
  useEffect(() => {
    setImageFailed(false);
  }, [profile?.image_url]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || updating) return;
    resetErrors();

    if (isAdmin) {
      const payload = {
        username: String(profile.username ?? '').trim(),
        email: String(profile.email ?? '').trim(),
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
          setProfile({
            ...profile,
            ...res.data,
            image_url: res.data.image_url
              ? res.data.image_url + `?t=${Date.now()}`
              : res.data.image_url,
          });          // Update auth context? Not necessary for admin? We'll update user in context
          // but admin doesn't have a user object in auth context? Actually we can update.
          // For simplicity, we can just logout if password changed.
        }
        showSuccess('Profile updated successfully');
        setProfileImage(null);
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
        setProfile({
          ...profile,
          ...res.data,
          role: userRole,
          image_url: res.data.image_url
            ? res.data.image_url + `?t=${Date.now()}`
            : res.data.image_url,
        }); setGender((res.data.gender as Gender) ?? gender);
        // Update auth context
        login({
          id: Number((res.data as User).id),
          username: res.data.username,
          role: userRole,
          firstname: res.data.firstname ?? '',
          lastname: res.data.lastname ?? '',
          email: res.data.email,
          phone: (res.data as User).phone ?? '',
        });
      }
      showSuccess('Profile updated successfully');
      setProfileImage(null);
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
              boxShadow: profileAvatarRing,
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
      ) : imageUrl && !imageFailed ? (
        <div className="position-relative">
          <img
            src={imageUrl}
            alt="Profile"
            onClick={() => window.open(imageUrl, '_blank')}
            onError={() => setImageFailed(true)}
            style={{
              width: 100,
              height: 100,
              objectFit: 'cover',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: profileAvatarRing,
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
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '40px',
              color: 'rgba(13, 110, 253, 0.45)',
              border: `2px dashed ${colors.primary}`,
              boxShadow: profileAvatarRing,
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

  if (loading) {
    return <PageShell title="My Profile" loading loadingMessage="Loading profile…" />;
  }
  if (!profile) {
    return (
      <PageShell title="My Profile">
        <p className="text-muted mb-0">Unable to load profile.</p>
      </PageShell>
    );
  }

  if (isAdmin) {
    return (
      <PageShell title="Admin Profile" subtitle="Update your admin account">
        <div style={profileFormPanelStyle}>
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
            <div className="mb-3 text-center small">
              <Link to="/admin/change-password" style={authLinkStyle}>
                Change password
              </Link>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={updating}>
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="My Profile" subtitle="Update your account details">
      <div style={profileFormPanelStyle}>
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
          <div className="mb-3 text-center small">
            <Link to="/change-password" style={authLinkStyle}>
              Change password
            </Link>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={updating}>
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </PageShell>
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