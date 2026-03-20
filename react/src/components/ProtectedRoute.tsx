import { Navigate, useLocation } from "react-router-dom";
import AuthManager from "../authManager";
import { roleIdToRole, type RoleString } from "../utils/roleUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: RoleString[];
  loginPath?: string;
}

export const ProtectedRoute = ({
  children,
  roles = [],
  loginPath = "/login",
}: ProtectedRouteProps) => {
  const location = useLocation();
  const user = AuthManager.getUser();

  if (!AuthManager.isAuthenticated() || !user) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

const role = typeof user.role === "number"
  ? roleIdToRole(user.role)
  : user.role;
  if (roles.length > 0 && !roles.includes(role)) {
    return (
      <Navigate
        to={
          role === "admin"
            ? "/admin/dashboard"
            : role === "subadmin"
              ? "/subadmin/dashboard"
              : "/user/dashboard"
        }
        replace
      />
    );
  }

  return <>{children}</>;
};
