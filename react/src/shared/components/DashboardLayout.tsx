import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { sessionGate } from '../utils/sessionGate';

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 70;

interface Props {
  children?: React.ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
  const { collapsed, isMobile } = useSidebar();
  const { user } = useAuth();
  const gate = sessionGate(user);
  const content = children ?? <Outlet />;

  return (
    <div style={{ display: 'flex', marginTop: 56 }}>
      <Sidebar gate={gate} />

      <div
        style={{
          flex: 1,
          padding: '20px',
          marginLeft: isMobile ? 0 : collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          width: '100%',
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default DashboardLayout;
