import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { FaBars, FaChevronDown, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { colors } from '../../theme/colors';
import styles from './Navbar.module.css';

const DASHBOARD_PATHS = [
  '/admin',
  '/subadmin',
  '/user',
  '/profile',
  '/users',
  '/tickets',
  '/admin/tickets',
  '/subadmin/tickets',
  '/admin/rbac',
  '/subadmin/rbac',
  '/change-password',
  '/admin/change-password',
];

const isDashboardRoute = (path: string) =>
  DASHBOARD_PATHS.some((p) => path === p || path.startsWith(p + '/'));

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, sidebarOpen } = useSidebar();
  const { user, isAuthenticated, logout } = useAuth();

  const role = user?.role;

  const homePath = !user
    ? '/'
    : role === 'admin'
      ? '/admin/dashboard'
      : role === 'subadmin'
        ? '/subadmin/dashboard'
        : '/user/dashboard';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate(role === 'admin' ? '/admin/login' : '/login');
    }
  };

  const showSidebarToggle = isAuthenticated && isDashboardRoute(location.pathname);

  const profilePath = role === 'admin' ? '/admin/profile' : '/profile';
  const passwordPath = role === 'admin' ? '/admin/change-password' : '/change-password';

  return (
    <nav
      className="navbar navbar-dark px-3 w-100 border-bottom"
      style={{
        backgroundColor: colors.sidebarBg,
        borderColor: colors.sidebarBorder,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
      }}
    >
      {/* Left: menu + brand (aligned with sidebar theme) */}
      <div className="d-flex align-items-center gap-2 min-w-0 flex-shrink-1">
        {showSidebarToggle && (
          <button
            type="button"
            className="btn btn-outline-light btn-sm flex-shrink-0"
            onClick={toggleSidebar}
            style={{ minWidth: 40 }}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        )}
        <Link
          className="navbar-brand mb-0 fw-semibold text-truncate"
          to={homePath}
          style={{ color: colors.sidebarText, maxWidth: showSidebarToggle ? 140 : 200 }}
        >
          MyApp
        </Link>
      </div>

      {/* Right: auth */}
      <div ref={dropdownRef} className="d-flex align-items-center flex-shrink-0" style={{ position: 'relative' }}>
        {!isAuthenticated ? (
          <div className="d-flex align-items-center gap-2">
            <Link className="btn btn-outline-light btn-sm" to="/login">
              Login
            </Link>
            <Link className="btn btn-outline-light btn-sm" to="/register">
              Register
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.userMenuBtn} d-flex align-items-center gap-2 text-start rounded-2 px-3 py-1`}
              onClick={() => setDropdownOpen((open) => !open)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              style={{ maxWidth: 220 }}
            >
              <span className="text-truncate">{user?.username || 'User'}</span>
              <FaChevronDown
                className={styles.chevron}
                size={12}
                style={{
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden
              />
            </button>

            {dropdownOpen ? (
              <div
                role="menu"
                className="py-1"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: '#fff',
                  color: '#212529',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  border: `1px solid ${colors.sidebarBorder}`,
                  minWidth: 200,
                  zIndex: 1200,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown-item py-2 px-3 small w-100 text-start border-0 bg-transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    navigate(profilePath);
                    setDropdownOpen(false);
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown-item py-2 px-3 small w-100 text-start border-0 bg-transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    navigate(passwordPath);
                    setDropdownOpen(false);
                  }}
                >
                  Change Password
                </button>
                <hr className="my-1 opacity-25" />
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown-item py-2 px-3 small w-100 text-start border-0 bg-transparent text-danger"
                  style={{ cursor: 'pointer' }}
                  onClick={() => void handleLogout()}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;