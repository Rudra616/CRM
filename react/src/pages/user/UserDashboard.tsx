import AuthManager from "../../authManager";

const UserDashboard: React.FC = () => {
  const username = AuthManager.getUser()?.username ?? "User";

  return <h2 className="mb-4">Welcome {username}</h2>;
};

export default UserDashboard;
