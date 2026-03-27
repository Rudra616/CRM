import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Providers } from './providers';
import { AppRoutes } from './routes';
import ServerDownOverlay from '../shared/components/ServerDownOverlay';
import { useServerStatus } from '../shared/hooks/useServerStatus';
import Navbar from '../shared/components/Navbar';   // ← import

const App = () => {
  const { serverDown, isChecking, attemptRecovery } = useServerStatus();

  if (serverDown) {
    return (
      <>
        <ServerDownOverlay onRetry={attemptRecovery} isChecking={isChecking} />
        <ToastContainer />
      </>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Providers>
        <Navbar />          
        <AppRoutes />
      </Providers>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;