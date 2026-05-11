import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardSummaryApi } from '../../admin/api/admin.api';
import { showError } from '../../../shared/utils/toast';
import { PageShell } from '../../../shared/components/PageShell';
import { DashboardStatCard } from '../../../shared/components/DashboardStatCard';
import { usePermissions } from '../../../context/PermissionContext';
import { PERMISSION_MODULE_KEYS } from '../../../shared/utils/permissionModules';

const SubadminDashboard: React.FC = () => {
  const { getModulePerm, permLoading } = usePermissions();
  const canViewUsers = getModulePerm(PERMISSION_MODULE_KEYS.USER).can_view;
  const canViewTickets = getModulePerm(PERMISSION_MODULE_KEYS.TICKET).can_view;
  const canViewRbac = getModulePerm(PERMISSION_MODULE_KEYS.MODULE).can_view;
  const showRbacLinks = canViewRbac;
  const subadminPerm = getModulePerm(PERMISSION_MODULE_KEYS.SUBADMIN);
  const canViewSubadmins = subadminPerm.can_view;
  const canAddSubadmin = subadminPerm.can_add;

  const [statsLoading, setStatsLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState(0);

  useEffect(() => {
    if (permLoading) return;
    if (!canViewUsers) return;

    let cancelled = false;
    setStatsLoading(true);
    void (async () => {
      try {
        const res = await getAdminDashboardSummaryApi();
        if (cancelled) return;
        const summary = res.data;
        setUserCount(summary?.userCount ?? 0);
        setActiveUsers(summary?.activeUsers ?? 0);
        setPendingUsers(summary?.pendingUsers ?? 0);
        setInactiveUsers(summary?.inactiveUsers ?? 0);
        setDeletedUsers(summary?.deletedUsers ?? 0);
      } catch (err) {
        if (!cancelled) {
          showError((err as { message?: string })?.message || 'Failed to load');
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permLoading, canViewUsers]);

  const pageBusy = permLoading || (canViewUsers && statsLoading);

  return (
    <PageShell
      title="Subadmin Dashboard"
      loading={pageBusy}
      loadingMessage={permLoading ? 'Loading…' : 'Loading dashboard…'}
    >
      {!permLoading && canViewUsers && (
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
      )}

      {/* {!permLoading && !canViewUsers && (
        <p className="text-muted mb-4">
          User statistics are not available for your account.
        </p>
      )} */}

      <div className="d-flex flex-wrap gap-2">
        {canViewUsers && (
          <Link className="btn btn-primary" to="/admin/users">
            Manage Users
          </Link>
        )}
        {canViewTickets && (
          <Link className="btn btn-outline-primary" to="/admin/tickets">
            Manage Tickets
          </Link>
        )}
        {canAddSubadmin && (
          <Link className="btn btn-outline-primary" to="/admin/create-subadmin">
            Create Subadmin
          </Link>
        )}
        {canViewSubadmins && (
          <Link className="btn btn-outline-primary" to="/admin/subadmins">
            Manage Subadmins
          </Link>
        )}
      </div>

      {showRbacLinks && (
        <div className="w-100 mt-3 pt-3 border-top d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-muted me-1">Access control:</span>
          {canViewRbac && (
            <Link className="btn btn-outline-secondary btn-sm" to="/admin/rbac/modules">
              Modules
            </Link>
          )}
          {canViewRbac && (
            <Link className="btn btn-outline-secondary btn-sm" to="/admin/rbac/roles">
              Roles
            </Link>
          )}
          {canViewRbac && (
            <Link className="btn btn-outline-secondary btn-sm" to="/admin/rbac/permissions">
              Role permissions
            </Link>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default SubadminDashboard;
