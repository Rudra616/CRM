import { useRef } from 'react';
import { Sidebar as ProSidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaUsers, FaUserShield, FaUserPlus, FaUser, FaTimes, FaKey } from 'react-icons/fa';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const SIDEBAR_WIDTH = 280;
const COLLAPSE_DELAY_MS = 400;

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
  const { collapsed, setCollapsed, sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const { user } = useAuth();
  const username = user?.username ?? 'User';
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getProfilePath = () => (role === 'admin' ? '/admin/profile' : '/profile');

  const nav = (path: string) => () => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!isMobile && collapsed) setCollapsed(false);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    collapseTimerRef.current = setTimeout(() => {
      if (!collapsed) setCollapsed(true);
      collapseTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  };

  return (
    <>
      {/* Overlay - click outside to close (mobile only) */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
          }}
        />
      )}

      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <ProSidebar
          collapsed={isMobile ? false : collapsed}
          width={`${SIDEBAR_WIDTH}px`}
          collapsedWidth="70px"
          transitionDuration={500}
          style={{
            position: 'fixed',
            top: 56,
            left: isMobile ? (sidebarOpen ? 0 : -SIDEBAR_WIDTH - 20) : 0,
            height: 'calc(100vh - 56px)',
            maxWidth: '85vw',
            transition: 'left 0.5s ease, width 1s ease',
            zIndex: 1002,
          }}
          backgroundColor={colors.sidebarBg}
        >
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
              <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(false)} aria-label="Close">
                <FaTimes size={16} />
              </button>
            )}
          </div>

          <Menu menuItemStyles={menuItemStyles} closeOnClick={false}>
            {role === 'admin' && (
              <>
                <MenuItem icon={<FaTachometerAlt />} onClick={nav('/admin/dashboard')}>Dashboard</MenuItem>
                <SubMenu label="Subadmin" icon={<FaUserShield />}>
                  <MenuItem icon={<FaUserPlus />} onClick={nav('/admin/create-subadmin')}>Create Subadmin</MenuItem>
                  <MenuItem icon={<FaUsers />} onClick={nav('/admin/subadmins')}>Manage Subadmins</MenuItem>
                </SubMenu>
                <MenuItem icon={<FaUsers />} onClick={nav('/admin/users')}>Manage Users</MenuItem>
                <MenuItem icon={<FaUser />} onClick={nav('/admin/profile')}>Profile</MenuItem>
                <MenuItem icon={<FaKey />} onClick={nav('/admin/change-password')}>Change password</MenuItem>
              </>
            )}
            {role === 'subadmin' && (
              <>
                <MenuItem icon={<FaTachometerAlt />} onClick={nav('/subadmin/dashboard')}>Dashboard</MenuItem>
                <MenuItem icon={<FaUsers />} onClick={nav('/users')}>Manage Users</MenuItem>
                <MenuItem icon={<FaUser />} onClick={nav('/profile')}>Profile</MenuItem>
                <MenuItem icon={<FaKey />} onClick={nav('/change-password')}>Change password</MenuItem>
              </>
            )}
            {role === 'user' && (
              <>
                <MenuItem icon={<FaTachometerAlt />} onClick={nav('/user/dashboard')}>Dashboard</MenuItem>
                <MenuItem icon={<FaUser />} onClick={nav('/profile')}>Profile</MenuItem>
                <MenuItem icon={<FaKey />} onClick={nav('/change-password')}>Change password</MenuItem>
              </>
            )}
          </Menu>
        </ProSidebar>
      </div>
    </>
  );
};

export default Sidebar;