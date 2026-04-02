import axios from 'axios';
import { notifyServerDown, notifyServerRecovered } from '../utils/serverStatus';
import {
  buildSessionEndedLoginUrl,
  clearClientAuthStorage,
  isPublicAuthPath,
} from '../utils/authSession';

function isPublicPasswordFlowUrl(url: string | undefined): boolean {
  const u = url || '';
  return (
    u.includes('reset-password') ||
    u.includes('verify-reset-token') ||
    u.includes('forgot-password')
  );
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api'),
  timeout: 10000,
  withCredentials: true, 
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
  (response) => {
    notifyServerRecovered();
    return response;
  },
  async (error) => {
    const reqUrl = error.config?.url || '';

    if (!error.response) {
      if (!isPublicPasswordFlowUrl(reqUrl)) {
        notifyServerDown();
      }
      return Promise.reject({
        success: false,
        message: 'Cannot connect to backend. Please check if server is running.',
      });
    }

    // Wrong role / permission: do not wipe auth — user still has a valid session.
    if (error.response.status === 403) {
      return Promise.reject(error.response?.data || error);
    }

    if (error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute =
        url.includes('/login') || url.includes('/register') || url.includes('/logout');
      const currentPath = window.location.pathname;
      const isAlreadyOnPublicAuthPage = isPublicAuthPath(currentPath);

      clearClientAuthStorage();

      // In-app requests after cookie removed/tampered: hard redirect so no half-loaded pages.
      if (!isAuthRoute && !isAlreadyOnPublicAuthPage) {
        window.location.replace(buildSessionEndedLoginUrl(currentPath));
        return Promise.reject(new Error('Session ended. Please sign in again.'));
      }
    }

    if (error.response?.status >= 500 && !isPublicPasswordFlowUrl(reqUrl)) {
      notifyServerDown();
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;