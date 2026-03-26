import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { roleIdToRole, type RoleString } from '../utils/roleUtils';

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

interface Props {
  role?: 'admin' | 'subadmin' | 'user';
  children?: React.ReactNode;
}

const DashboardLayout = ({ role: roleProp, children }: Props) => {
  const { collapsed, isMobile } = useSidebar();
  const { user } = useAuth();
  const role = (roleProp ?? roleIdToRole(user?.role) ?? 'user') as RoleString;
  const content = children ?? <Outlet />;

  return (
    <div style={{ display: 'flex', marginTop: 56 }}>
      <Sidebar role={role} />

      <div
        style={{
          flex: 1,
          padding: '20px',
          marginLeft: isMobile ? 0 : collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          transition: 'margin-left 0.5s ease',
          width: '100%',
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default DashboardLayout;