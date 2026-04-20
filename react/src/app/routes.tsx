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
import ManagePermissions from '../modules/admin/pages/ManagePermissions';
import ManageModulesPage from '../modules/admin/pages/ManageModulesPage';
import ManageRolesPage from '../modules/admin/pages/ManageRolesPage';

// Subadmin pages
import SubadminDashboard from '../modules/subadmin/pages/SubadminDashboard';

// User pages
import UserDashboard from '../modules/user/pages/UserDashboard';
import Profile from '../modules/user/pages/Profile';
import ChangePassword from '../modules/user/pages/ChangePassword';
import UserCreateTicketPage from '../modules/ticket/pages/UserCreateTicketPage';
import UserMyTicketsPage from '../modules/ticket/pages/UserMyTicketsPage';
import StaffTicketsPage from '../modules/ticket/pages/StaffTicketsPage';

export const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<Login />} />
    <Route path="/admin/login" element={<Login />} />
    <Route path="/subadmin" element={<Login />} />
    <Route path="/subadmin/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Protected routes with DashboardLayout */}
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />
      <Route path="/admin/subadmins" element={<ProtectedRoute roles={['admin']}><ManageSubadmins /></ProtectedRoute>} />
      <Route path="/admin/rbac/modules" element={<ProtectedRoute roles={['admin']}><ManageModulesPage /></ProtectedRoute>} />
      <Route path="/admin/rbac/roles" element={<ProtectedRoute roles={['admin']}><ManageRolesPage /></ProtectedRoute>} />
      <Route path="/admin/rbac/permissions" element={<ProtectedRoute roles={['admin']}><ManagePermissions /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<Navigate to="/admin/rbac/permissions" replace />} />
      <Route path="/admin/tickets" element={<ProtectedRoute roles={['admin']}><StaffTicketsPage /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute roles={['admin']}><Profile /></ProtectedRoute>} />
      <Route path="/admin/change-password" element={<ProtectedRoute roles={['admin']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/admin/create-subadmin" element={<ProtectedRoute roles={['admin']}><Register /></ProtectedRoute>} />

      {/* Subadmin routes */}
      <Route path="/subadmin/dashboard" element={<ProtectedRoute roles={['subadmin']}><SubadminDashboard /></ProtectedRoute>} />
      <Route path="/subadmin/users" element={<ProtectedRoute roles={['subadmin']}><ManageUsers /></ProtectedRoute>} />
      <Route path="/subadmin/tickets" element={<ProtectedRoute roles={['subadmin']}><StaffTicketsPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/modules" element={<ProtectedRoute roles={['subadmin']}><ManageModulesPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/roles" element={<ProtectedRoute roles={['subadmin']}><ManageRolesPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/permissions" element={<ProtectedRoute roles={['subadmin']}><ManagePermissions /></ProtectedRoute>} />

      {/* User routes */}
      <Route path="/user/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/tickets/create" element={<ProtectedRoute roles={['user']}><UserCreateTicketPage /></ProtectedRoute>} />
      <Route path="/tickets/my" element={<ProtectedRoute roles={['user']}><UserMyTicketsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={['subadmin', 'user']}><Profile /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute roles={['subadmin', 'user']}><ChangePassword /></ProtectedRoute>} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes>
);