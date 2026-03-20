import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import AuthManager from "../authManager";
import { useSidebar } from "../context/SidebarContext";
import { roleIdToRole } from "../utils/roleUtils";
import { logoutApi, logoutAdminApi } from "../api/authApi";

const DASHBOARD_PATHS = ["/admin", "/subadmin", "/user", "/profile", "/users"];

const isDashboardRoute = (path: string) =>
  DASHBOARD_PATHS.some((p) => path === p || path.startsWith(p + "/"));

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, sidebarOpen } = useSidebar();
  const [isLoggedIn, setIsLoggedIn] = useState(AuthManager.isAuthenticated());

  useEffect(() => {
    setIsLoggedIn(AuthManager.isAuthenticated());
  }, [location.pathname]);

  const logout = async () => {
    const user = AuthManager.getUser();

    const role =
      typeof user?.role === "number" ? roleIdToRole(user.role) : user?.role;
    try {
      if (role === "admin") await logoutAdminApi();
      else await logoutApi();
    } catch {
    } finally {
      AuthManager.clearToken();
      navigate(role === "admin" ? "/admin" : "/login");
    }
  };

  const showSidebarToggle = isLoggedIn && isDashboardRoute(location.pathname);
  const user = AuthManager.getUser();

  const role =
    typeof user?.role === "number" ? roleIdToRole(user.role) : user?.role;

  const homePath = !user
    ? "/"
    : role === "admin"
      ? "/admin/dashboard"
      : role === "subadmin"
        ? "/subadmin/dashboard"
        : "/user/dashboard";
  return (
    <nav
      className="navbar navbar-dark bg-dark px-3 w-100"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1100,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div className="d-flex align-items-center gap-2">
        {showSidebarToggle && (
          <button
            className="btn btn-outline-light btn-sm"
            onClick={toggleSidebar}
            style={{ minWidth: 40 }}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        )}
        <Link className="navbar-brand" to={homePath}>
          MyApp
        </Link>
      </div>

      <div>
        {!isLoggedIn ? (
          <>
            <Link className="btn btn-outline-light btn-sm me-2" to="/login">
              Login
            </Link>
            <Link className="btn btn-outline-light btn-sm me-2" to="/register">
              Register
            </Link>
            {/* <Link className="btn btn-outline-info btn-sm" to="/admin">Admin</Link> */}
          </>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={logout}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
