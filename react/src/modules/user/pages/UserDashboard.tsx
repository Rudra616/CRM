import { useAuth } from '../../../context/AuthContext';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username ?? 'User';

  return <h2 className="mb-4">Welcome {username}</h2>;
};

export default UserDashboard;