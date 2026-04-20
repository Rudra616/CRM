import { Sidebar as ProSidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaUsers,
  FaUserShield,
  FaUserPlus,
  FaUser,
  FaTimes,
  FaKey,
  FaTicketAlt,
  FaShieldAlt,
  FaCube,
  FaUserTag,
} from 'react-icons/fa';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { colors } from '../../theme/colors';

const SIDEBAR_WIDTH = 280;

const menuItemStyles = {
  label: { color: colors.sidebarText },
  icon: { color: colors.sidebarText },
  button: { color: colors.sidebarText, '&:hover': { backgroundColor: colors.sidebarHover } },
  SubMenuExpandIcon: { color: colors.sidebarText },
  subMenuContent: { color: colors.sidebarText, backgroundColor: colors.sidebarBg },
};

interface Props {
  role: 'admin' | 'subadmin' | 'user';
}

const Sidebar = ({ role }: Props) => {
  const navigate = useNavigate();
  const { collapsed, sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const username = user?.username ?? 'User';

  // ─── Subadmin: check which modules they can VIEW ──────────────────────────
  // If can_view = false for a module, don't even show that menu item.
  // Admin always gets true from getModulePerm (handled in PermissionContext).
  //
  // Add more modules here as you create them, e.g.:
  //   const canViewProducts = getModulePerm('product').can_view;
  //   const canViewOrders   = getModulePerm('order').can_view;
  //
  // ⚠️  Module name must exactly match the `name` column in your `module` DB table.
  const canViewUsers = getModulePerm('user').can_view;
  const canViewTickets = getModulePerm('ticket').can_view;
  const canViewRbModule = getModulePerm('module').can_view;
  const canViewRbRole = getModulePerm('role').can_view;
  const canViewRbPerm = getModulePerm('role_permission').can_view;
  const showSubadminAccessMenu = canViewRbModule || canViewRbRole || canViewRbPerm;

  const getProfilePath = () => (role === 'admin' ? '/admin/profile' : '/profile');

  const nav = (path: string) => () => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <>
      {/* Overlay — mobile only */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
          }}
        />
      )}

      <ProSidebar
        collapsed={isMobile ? false : collapsed}
        width={`${SIDEBAR_WIDTH}px`}
        collapsedWidth="70px"
        style={{
          position: 'fixed',
          top: 56,
          left: isMobile ? (sidebarOpen ? 0 : -SIDEBAR_WIDTH - 20) : 0,
          height: 'calc(100vh - 56px)',
          maxWidth: '85vw',
          zIndex: 1002,
        }}
        backgroundColor={colors.sidebarBg}
      >
        {/* ── Username / profile link ──────────────────────────────────────── */}
        <div
          style={{
            padding: 15,
            borderBottom: `1px solid ${colors.sidebarBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-between' : 'center',
            color: colors.sidebarText,
            gap: 8,
          }}
        >
          <span
            role="button"
            tabIndex={0}
            onClick={nav(getProfilePath())}
            onKeyDown={(e) => e.key === 'Enter' && nav(getProfilePath())()}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FaUser /> {!collapsed && username}
          </span>
          {isMobile && (
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close"
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>

        <Menu menuItemStyles={menuItemStyles} closeOnClick={false}>

          {/* ── ADMIN menu ────────────────────────────────────────────────── */}
          {/*    Admin sees everything — no permission checks needed here      */}
          {role === 'admin' && (
            <>
              <MenuItem icon={<FaTachometerAlt />} onClick={nav('/admin/dashboard')}>
                Dashboard
              </MenuItem>

              <SubMenu label="Subadmin" icon={<FaUserShield />}>
                <MenuItem icon={<FaUserPlus />} onClick={nav('/admin/create-subadmin')}>
                  Create Subadmin
                </MenuItem>
                <MenuItem icon={<FaUsers />} onClick={nav('/admin/subadmins')}>
                  Manage Subadmins
                </MenuItem>
              </SubMenu>

              <MenuItem icon={<FaUsers />} onClick={nav('/admin/users')}>
                Manage Users
              </MenuItem>

              <SubMenu label="Access control" icon={<FaShieldAlt />}>
                <MenuItem icon={<FaCube />} onClick={nav('/admin/rbac/modules')}>
                  Modules
                </MenuItem>
                <MenuItem icon={<FaUserTag />} onClick={nav('/admin/rbac/roles')}>
                  Roles
                </MenuItem>
                <MenuItem icon={<FaShieldAlt />} onClick={nav('/admin/rbac/permissions')}>
                  Role permissions
                </MenuItem>
              </SubMenu>

              <SubMenu label="Tickets" icon={<FaTicketAlt />}>
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/admin/tickets')}>
                  Manage Tickets
                </MenuItem>
              </SubMenu>

              <MenuItem icon={<FaUser />} onClick={nav('/admin/profile')}>
                Profile
              </MenuItem>

              <MenuItem icon={<FaKey />} onClick={nav('/admin/change-password')}>
                Change Password
              </MenuItem>
            </>
          )}

          {/* ── SUBADMIN menu ─────────────────────────────────────────────── */}
          {/*    Each menu item is gated by the matching module's can_view.    */}
          {/*    Dashboard, Profile, Change Password are always visible —      */}
          {/*    they are not module-gated (no DB permission row needed).      */}
          {role === 'subadmin' && (
            <>
              {/* Always visible — not a DB-module-gated page */}
              <MenuItem icon={<FaTachometerAlt />} onClick={nav('/subadmin/dashboard')}>
                Dashboard
              </MenuItem>

              {/*
                Manage Users:
                  - shown  → subadmin has can_view = 1 for module "user" in DB
                  - hidden → can_view = 0 or no permission row at all
              */}
              {canViewUsers && (
                <MenuItem icon={<FaUsers />} onClick={nav('/subadmin/users')}>
                  Manage Users
                </MenuItem>
              )}

              {canViewTickets && (
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/subadmin/tickets')}>
                  Tickets
                </MenuItem>
              )}

              {showSubadminAccessMenu && (
                <SubMenu label="Access control" icon={<FaShieldAlt />}>
                  {canViewRbModule && (
                    <MenuItem icon={<FaCube />} onClick={nav('/subadmin/rbac/modules')}>
                      Modules
                    </MenuItem>
                  )}
                  {canViewRbRole && (
                    <MenuItem icon={<FaUserTag />} onClick={nav('/subadmin/rbac/roles')}>
                      Roles
                    </MenuItem>
                  )}
                  {canViewRbPerm && (
                    <MenuItem icon={<FaShieldAlt />} onClick={nav('/subadmin/rbac/permissions')}>
                      Role permissions
                    </MenuItem>
                  )}
                </SubMenu>
              )}

              {/*
                Add more module-gated items below as you create modules:

                {canViewProducts && (
                  <MenuItem icon={<FaBox />} onClick={nav('/subadmin/products')}>
                    Manage Products
                  </MenuItem>
                )}

                {canViewOrders && (
                  <MenuItem icon={<FaClipboardList />} onClick={nav('/subadmin/orders')}>
                    Manage Orders
                  </MenuItem>
                )}
              */}

              {/* Always visible — not module-gated */}
              <MenuItem icon={<FaUser />} onClick={nav('/profile')}>
                Profile
              </MenuItem>

              <MenuItem icon={<FaKey />} onClick={nav('/change-password')}>
                Change Password
              </MenuItem>
            </>
          )}

          {/* ── USER menu ─────────────────────────────────────────────────── */}
          {role === 'user' && (
            <>
              <MenuItem icon={<FaTachometerAlt />} onClick={nav('/user/dashboard')}>
                Dashboard
              </MenuItem>
              <SubMenu label="Tickets" icon={<FaTicketAlt />}>
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/tickets/create')}>
                  Create Ticket
                </MenuItem>
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/tickets/my')}>
                  My Tickets
                </MenuItem>
              </SubMenu>
              <MenuItem icon={<FaUser />} onClick={nav('/profile')}>
                Profile
              </MenuItem>
              <MenuItem icon={<FaKey />} onClick={nav('/change-password')}>
                Change Password
              </MenuItem>
            </>
          )}

        </Menu>
      </ProSidebar>
    </>
  );
};

export default Sidebar;