import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsersApi } from '../../admin/api/admin.api';
import { showError } from '../../../shared/utils/toast';
import { PageShell } from '../../../shared/components/PageShell';
import { DashboardStatCard } from '../../../shared/components/DashboardStatCard';

const SubadminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await getUsersApi();
        setUserCount(Array.isArray(res.data) ? res.data.length : 0);
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
      title="Subadmin Dashboard"
      loading={loading}
      loadingMessage="Loading dashboard…"
    >
      <div className="row g-4 mb-4">
        <DashboardStatCard
          title="Total users"
          value={userCount}
          hint="Users you can manage"
          colClass="col-sm-6 col-md-4"
        />
      </div>
      <Link className="btn btn-primary" to="/users">
        Manage Users
      </Link>
    </PageShell>
  );
};

export default SubadminDashboard;
