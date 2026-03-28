import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubadminsApi, getUsersApi } from '../api/admin.api';
import { showError } from '../../../shared/utils/toast';
import { PageShell } from '../../../shared/components/PageShell';
import { DashboardStatCard } from '../../../shared/components/DashboardStatCard';

const AdminDashboard = () => {
  const [subadminCount, setSubadminCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [subRes, userRes] = await Promise.all([
          getSubadminsApi(),
          getUsersApi(),
        ]);
        setSubadminCount(Array.isArray(subRes.data) ? subRes.data.length : 0);
        setUserCount(Array.isArray(userRes.data) ? userRes.data.length : 0);
      } catch (err) {
        showError((err as { message?: string })?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Overview of subadmins and registered users"
      loading={loading}
      loadingMessage="Loading dashboard…"
    >
      <div className="row g-4">
        <DashboardStatCard
          title="Subadmins"
          value={subadminCount}
          hint="Total registered subadmins"
          onClick={() => navigate('/admin/subadmins')}
        />
        <DashboardStatCard
          title="Users"
          value={userCount}
          hint="Total registered users"
          onClick={() => navigate('/admin/users')}
        />
      </div>
    </PageShell>
  );
};

export default AdminDashboard;
