import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import DashboardLayout from '../shared/components/DashboardLayout';

// Auth pages
import Login from '../modules/auth/pages/Login';
import Register from '../modules/auth/pages/Register';
import ForgotPassword from '../modules/auth/pages/ForgotPassword';
import ResetPassword from '../modules/auth/pages/ResetPassword';

// Admin pages
import AdminDashboard from '../modules/admin/pages/AdminDashboard';
import ManageUsers from '../modules/admin/pages/ManageUsers';
import ManageSubadmins from '../modules/admin/pages/ManageSubadmins';

// Subadmin pages
import SubadminDashboard from '../modules/subadmin/pages/SubadminDashboard';

// User pages
import UserDashboard from '../modules/user/pages/UserDashboard';
import Profile from '../modules/user/pages/Profile';
import ChangePassword from '../modules/user/pages/ChangePassword';

export const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<Login />} />
    <Route path="/admin/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Protected routes with DashboardLayout */}
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />
      <Route path="/admin/subadmins" element={<ProtectedRoute roles={['admin']}><ManageSubadmins /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute roles={['admin']}><Profile /></ProtectedRoute>} />
      <Route path="/admin/change-password" element={<ProtectedRoute roles={['admin']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/admin/create-subadmin" element={<ProtectedRoute roles={['admin']}><Register /></ProtectedRoute>} />

      {/* Subadmin routes */}
      <Route path="/subadmin/dashboard" element={<ProtectedRoute roles={['subadmin']}><SubadminDashboard /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['subadmin']}><ManageUsers /></ProtectedRoute>} />

      {/* User routes */}
      <Route path="/user/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={['subadmin', 'user']}><Profile /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute roles={['subadmin', 'user']}><ChangePassword /></ProtectedRoute>} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes>
);