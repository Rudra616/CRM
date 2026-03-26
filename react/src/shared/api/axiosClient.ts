import axios from 'axios';
import { notifyServerDown } from '../utils/serverStatus';
import { roleIdToRole } from '../utils/roleUtils';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      notifyServerDown();
      return Promise.reject({
        success: false,
        message: 'Cannot connect to backend. Please check if server is running.',
      });
    }

    if (error.response.status === 401) {
      const url = error.config?.url || '';
      const isLoginOrRegister = url.includes('/login') || url.includes('/register');
      const isLogout = url.includes('/logout');
      const hadToken = !!localStorage.getItem('token');

      if (!isLoginOrRegister && !isLogout && hadToken) {
        const user = localStorage.getItem('user');
        let role = 'user';
        if (user) {
          const parsed = JSON.parse(user);
          role = roleIdToRole(parsed.role);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = role === 'admin' ? '/admin' : '/login';
        return Promise.reject(new Error('Invalid or expired token. Please login again.'));
      }
    }

    if (error.response?.status >= 500) {
      notifyServerDown();
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;