import axios from 'axios';
import { notifyServerDown } from '../utils/serverStatus';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api'),
  timeout: 10000,
  withCredentials: true, // 🔥 MUST FOR COOKIES
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      notifyServerDown();
      return Promise.reject({
        success: false,
        message: 'Cannot connect to backend. Please check if server is running.',
      });
    }

    if (error.response.status === 401 || error.response.status === 403) {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/login') || url.includes('/register') || url.includes('/logout');
      const isProfileBootstrap = url.includes('/profile');
      const currentPath = window.location.pathname;
      const isAlreadyOnPublicAuthPage =
        currentPath === '/login' ||
        currentPath === '/admin' ||
        currentPath === '/admin/login' ||
        currentPath === '/register' ||
        currentPath === '/forgot-password' ||
        currentPath === '/reset-password';

      // Force-clear stale client auth state
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Redirect only when this is not expected bootstrap/auth traffic.
      if (!isAuthRoute && !isProfileBootstrap && !isAlreadyOnPublicAuthPage) {
        const target = currentPath.startsWith('/admin') ? '/admin' : '/login';
        if (currentPath !== target) {
          window.location.href = target;
        }
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
    }

    if (error.response?.status >= 500) {
      notifyServerDown();
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;