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
      <div className="d-flex gap-2 flex-wrap">
        <Link className="btn btn-primary" to="/tickets/create">
          Create Ticket
        </Link>
        <Link className="btn btn-outline-primary" to="/tickets/my">
          My Tickets
        </Link>
        <Link className="btn btn-outline-secondary" to="/profile">
          My Profile
        </Link>
      </div>
    </PageShell>
  );
};

export default UserDashboard;
