import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageShell } from '../../../shared/components/PageShell';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username ?? 'User';

  return (
    <PageShell
      title={`Welcome, ${username}`}
      subtitle="Your account home"
    >
      {/* <p className="text-muted mb-4 mb-md-0">
        Use the navigation bar to open your profile or sign out.
      </p> */}
      <Link className="btn btn-primary" to="/profile">
        My Profile
      </Link>
    </PageShell>
  );
};

export default UserDashboard;
