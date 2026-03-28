import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { RoleString } from '../utils/roleUtils';
import { getLoginRedirectUrl } from '../utils/authSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: RoleString[];
  loginPath?: string;
}

export const ProtectedRoute = ({
  children,
  roles = [],
  loginPath = '/login',
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const signInPath =
    loginPath !== '/login' ? loginPath : getLoginRedirectUrl(location.pathname);

  // Wait until session bootstrap (GET /session) finishes
  if (isLoading) {
    return <div>Loading...</div>; // or a spinner
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={signInPath} state={{ from: location }} replace />;
  }

  const role = user.role;


  if (roles.length > 0 && !roles.includes(role)) {
    return (
      <Navigate
        to={
          role === 'admin'
            ? '/admin/dashboard'
            : role === 'subadmin'
              ? '/subadmin/dashboard'
              : '/user/dashboard'
        }
        replace
      />
    );
  }

  return <>{children}</>;
};