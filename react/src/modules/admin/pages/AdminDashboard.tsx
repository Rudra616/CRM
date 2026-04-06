import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardSummaryApi, getSubadminsApi, getUsersApi } from '../api/admin.api';
import { showError } from '../../../shared/utils/toast';
import { PageShell } from '../../../shared/components/PageShell';
import { DashboardStatCard } from '../../../shared/components/DashboardStatCard';

const AdminDashboard = () => {
  const [subadminCount, setSubadminCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        try {
          const res = await getAdminDashboardSummaryApi();
          const dashboard = res.data;
          setUserCount(dashboard?.userCount ?? 0);
          setSubadminCount(dashboard?.subadminCount ?? 0);
          setActiveUsers(dashboard?.activeUsers ?? 0);
          setPendingUsers(dashboard?.pendingUsers ?? 0);
          setInactiveUsers(dashboard?.inactiveUsers ?? 0);
          setDeletedUsers(dashboard?.deletedUsers ?? 0);
        } catch (err: unknown) {
          const msg = (err as { message?: string })?.message || '';
          // Backward compatibility
          if (!msg.toLowerCase().includes('not found')) throw err;
const [subRes, userRes] = await Promise.all([getSubadminsApi(), getUsersApi(1, 10)]);
          setSubadminCount(Array.isArray(subRes.data) ? subRes.data.length : 0);
          setUserCount(Array.isArray(userRes.data) ? userRes.data.length : 0);
        }
      } catch (err) {
        showError((err as { message?: string })?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Function to navigate to users page with a status filter
  const navigateToUsers = (status?: 'active' | 'pending' | 'inactive' | 'delete') => {
    if (status) {
      navigate('/admin/users', { state: { statusFilter: status } });
    } else {
      navigate('/admin/users');
    }
  };

  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Overview of subadmins and registered users"
      loading={loading}
      loadingMessage="Loading dashboard…"
    >
      <div className="row g-4">
        {/* Subadmin */}
        <DashboardStatCard
          title="Subadmins"
          value={subadminCount}
          hint="Total registered subadmins"
          onClick={() => navigate('/admin/subadmins')}
        />

        {/* Users Total */}
        <DashboardStatCard
          title="Users"
          value={userCount}
          hint="Total registered users"
          onClick={() => navigateToUsers()}
        />

        {/* User Status Breakdown */}
        <DashboardStatCard
          title="Active Users"
          value={activeUsers}
          hint="Currently active users"
          onClick={() => navigateToUsers('active')}
        />

        <DashboardStatCard
          title="Pending Users"
          value={pendingUsers}
          hint="Users waiting approval"
          onClick={() => navigateToUsers('pending')}
        />

        <DashboardStatCard
          title="Inactive Users"
          value={inactiveUsers}
          hint="Disabled or inactive users"
          onClick={() => navigateToUsers('inactive')}
        />

        <DashboardStatCard
          title="Deleted Users"
          value={deletedUsers}
          hint="Soft deleted users"
          onClick={() => navigate('/admin/users', { state: { statusFilter: 'delete' } })}
        />
      </div>
    </PageShell>
  );
};

export default AdminDashboard;