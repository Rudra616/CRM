import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { colors } from '../../theme/colors';

const DASHBOARD_PATHS = ['/admin', '/subadmin', '/user', '/profile', '/users'];

const isDashboardRoute = (path: string) =>
  DASHBOARD_PATHS.some((p) => path === p || path.startsWith(p + '/'));

const Navbar = () => {
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

  return (
    <nav
      className="navbar navbar-dark px-3 w-100"
      style={{
        backgroundColor: colors.sidebarBg,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div className="d-flex align-items-center gap-2">
        {showSidebarToggle && (
          <button
            className="btn btn-outline-light btn-sm"
            onClick={toggleSidebar}
            style={{ minWidth: 40 }}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        )}
        <Link className="navbar-brand" to={homePath}>
          MyApp
        </Link>
      </div>

      <div>
        {!isAuthenticated ? (
          <>
            <Link className="btn btn-outline-light btn-sm me-2" to="/login">Login</Link>
            <Link className="btn btn-outline-light btn-sm me-2" to="/register">Register</Link>
          </>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;