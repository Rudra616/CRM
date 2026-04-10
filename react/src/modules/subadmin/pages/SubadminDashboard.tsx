import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardSummaryApi } from '../../admin/api/admin.api';
import { showError } from '../../../shared/utils/toast';
import { PageShell } from '../../../shared/components/PageShell';
import { DashboardStatCard } from '../../../shared/components/DashboardStatCard';

const SubadminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getAdminDashboardSummaryApi();
      const summary = res.data;
      setUserCount(summary?.userCount ?? 0);
      setActiveUsers(summary?.activeUsers ?? 0);
      setPendingUsers(summary?.pendingUsers ?? 0);
      setInactiveUsers(summary?.inactiveUsers ?? 0);
      setDeletedUsers(summary?.deletedUsers ?? 0);
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
          title="Users"
          value={userCount}
          hint="Total registered users"
          colClass="col-sm-6 col-md-4"
        />
        <DashboardStatCard
          title="Active Users"
          value={activeUsers}
          hint="Currently active users"
          colClass="col-sm-6 col-md-4"
        />
        <DashboardStatCard
          title="Pending Users"
          value={pendingUsers}
          hint="Users waiting approval"
          colClass="col-sm-6 col-md-4"
        />
        <DashboardStatCard
          title="Inactive Users"
          value={inactiveUsers}
          hint="Disabled or inactive users"
          colClass="col-sm-6 col-md-4"
        />
        <DashboardStatCard
          title="Deleted Users"
          value={deletedUsers}
          hint="Soft deleted users"
          colClass="col-sm-6 col-md-4"
        />
      </div>
      <Link className="btn btn-primary" to="/subadmin/users">
        Manage Users
      </Link>
    </PageShell>
  );
};

export default SubadminDashboard;
