import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  sessionGate,
  homePathForGate,
  type SessionGate,
} from '../utils/sessionGate';
import { getLoginRedirectUrl } from '../utils/authSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Allowed session kinds — empty means any authenticated user. */
  gates?: SessionGate[];
  loginPath?: string;
}

export const ProtectedRoute = ({
  children,
  gates = [],
  loginPath = '/login',
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const signInPath =
    loginPath !== '/login' ? loginPath : getLoginRedirectUrl(location.pathname);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={signInPath} state={{ from: location }} replace />;
  }

  const gate = sessionGate(user);

  if (gates.length > 0 && !gates.includes(gate)) {
    return <Navigate to={homePathForGate(gate)} replace />;
  }

  return <>{children}</>;
};
