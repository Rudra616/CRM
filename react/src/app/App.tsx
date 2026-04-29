import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Providers } from './providers';
import { AppRoutes } from './routes';
import Navbar from '../shared/components/Navbar';

const App = () => {
  return (
    <>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Providers>
          <Navbar />
          <AppRoutes />
        </Providers>
      </BrowserRouter>
      <ToastContainer />
    </>
  );
};

export default App;