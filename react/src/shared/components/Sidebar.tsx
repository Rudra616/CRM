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
  FaBullhorn,
} from 'react-icons/fa';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { colors } from '../../theme/colors';
import { PERMISSION_MODULE_KEYS } from '../utils/permissionModules';
import type { SessionGate } from '../utils/sessionGate';
import { useTicketUnread } from '../../context/TicketUnreadContext';

const SIDEBAR_WIDTH = 280;

const menuItemStyles = {
  label: { color: colors.sidebarText },
  icon: { color: colors.sidebarText },
  button: { color: colors.sidebarText, '&:hover': { backgroundColor: colors.sidebarHover } },
  SubMenuExpandIcon: { color: colors.sidebarText },
  subMenuContent: { color: colors.sidebarText, backgroundColor: colors.sidebarBg },
};

interface Props {
  gate: SessionGate;
}

const Sidebar = ({ gate }: Props) => {
  const navigate = useNavigate();
  const { collapsed, sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const { user } = useAuth();
  const { getModulePerm } = usePermissions();
  const username = user?.username ?? 'User';
  const { summary } = useTicketUnread();
  const ticketsWithUnread = summary.ticketsWithUnread;

  const canView = (moduleKey: string): boolean => getModulePerm(moduleKey).can_view;
  const canViewUsers = canView(PERMISSION_MODULE_KEYS.USER);
  const canViewTickets = canView(PERMISSION_MODULE_KEYS.TICKET);
  const canViewAccessControl = canView(PERMISSION_MODULE_KEYS.MODULE);
  const showAccessControlMenu = canViewAccessControl;

  const subadminPerm = getModulePerm(PERMISSION_MODULE_KEYS.SUBADMIN);
  const showStaffSubadminMenu = subadminPerm.can_view || subadminPerm.can_add;

  const getProfilePath = () => (gate === 'member' ? '/profile' : '/admin/profile');

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

          {/* ── STAFF menu ────────────────────────────────────────────────── */}
          {gate === 'staff' && (
            <>
              <MenuItem icon={<FaTachometerAlt />} onClick={nav('/admin/dashboard')}>
                Dashboard
              </MenuItem>

              {user?.is_main_admin && (
                <MenuItem icon={<FaBullhorn />} onClick={nav('/admin/broadcast')}>
                  Broadcast
                </MenuItem>
              )}

              {canViewUsers && (
                <MenuItem icon={<FaUsers />} onClick={nav('/admin/users')}>
                  Manage Users
                </MenuItem>
              )}

              {canViewTickets && (
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/admin/tickets')}>
                  <span className="d-inline-flex align-items-center gap-2">
                    Tickets
                    {ticketsWithUnread > 0 ? (
                      <span
                        className="badge rounded-pill bg-danger"
                        style={{ fontSize: '0.7rem' }}
                      >
                        {ticketsWithUnread > 99 ? '99+' : ticketsWithUnread}
                      </span>
                    ) : null}
                  </span>
                </MenuItem>
              )}

              {showStaffSubadminMenu && (
                <SubMenu label="Subadmin" icon={<FaUserShield />}>
                  {subadminPerm.can_add && (
                    <MenuItem icon={<FaUserPlus />} onClick={nav('/admin/create-subadmin')}>
                      Create Subadmin
                    </MenuItem>
                  )}
                  {subadminPerm.can_view && (
                    <MenuItem icon={<FaUsers />} onClick={nav('/admin/subadmins')}>
                      Manage Subadmins
                    </MenuItem>
                  )}
                </SubMenu>
              )}

              {showAccessControlMenu && (
                <SubMenu label="Access control" icon={<FaShieldAlt />}>
                  {canViewAccessControl && (
                    <MenuItem icon={<FaCube />} onClick={nav('/admin/rbac/modules')}>
                      Modules
                    </MenuItem>
                  )}
                  {canViewAccessControl && (
                    <MenuItem icon={<FaUserTag />} onClick={nav('/admin/rbac/roles')}>
                      Roles
                    </MenuItem>
                  )}
                  {canViewAccessControl && (
                    <MenuItem icon={<FaShieldAlt />} onClick={nav('/admin/rbac/permissions')}>
                      Role permissions
                    </MenuItem>
                  )}
                </SubMenu>
              )}

              {/* Always visible — not module-gated */}
              <MenuItem icon={<FaUser />} onClick={nav('/admin/profile')}>
                Profile
              </MenuItem>

              <MenuItem icon={<FaKey />} onClick={nav('/admin/change-password')}>
                Change Password
              </MenuItem>
            </>
          )}

          {/* ── USER menu ─────────────────────────────────────────────────── */}
          {gate === 'member' && (
            <>
              <MenuItem icon={<FaTachometerAlt />} onClick={nav('/user/dashboard')}>
                Dashboard
              </MenuItem>
              <SubMenu label="Tickets" icon={<FaTicketAlt />}>
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/tickets/create')}>
                  Create Ticket
                </MenuItem>
                <MenuItem icon={<FaTicketAlt />} onClick={nav('/tickets/my')}>
                  <span className="d-inline-flex align-items-center gap-2">
                    My Tickets
                    {ticketsWithUnread > 0 ? (
                      <span
                        className="badge rounded-pill bg-danger"
                        style={{ fontSize: '0.7rem' }}
                      >
                        {ticketsWithUnread > 99 ? '99+' : ticketsWithUnread}
                      </span>
                    ) : null}
                  </span>
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