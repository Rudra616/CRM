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
    <Route path="/subadmin" element={<Navigate to="/admin/login" replace />} />
    <Route path="/subadmin/login" element={<Navigate to="/admin/login" replace />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Protected routes with DashboardLayout */}
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute gates={['owner']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute gates={['owner']}><ManageUsers /></ProtectedRoute>} />
      <Route path="/admin/subadmins" element={<ProtectedRoute gates={['owner']}><ManageSubadmins /></ProtectedRoute>} />
      <Route path="/admin/rbac/modules" element={<ProtectedRoute gates={['owner']}><ManageModulesPage /></ProtectedRoute>} />
      <Route path="/admin/rbac/roles" element={<ProtectedRoute gates={['owner']}><ManageRolesPage /></ProtectedRoute>} />
      <Route path="/admin/rbac/permissions" element={<ProtectedRoute gates={['owner']}><ManagePermissions /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<Navigate to="/admin/rbac/permissions" replace />} />
      <Route path="/admin/tickets" element={<ProtectedRoute gates={['owner']}><StaffTicketsPage /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute gates={['owner']}><Profile /></ProtectedRoute>} />
      <Route path="/admin/change-password" element={<ProtectedRoute gates={['owner']}><ChangePassword /></ProtectedRoute>} />
      <Route path="/admin/create-subadmin" element={<ProtectedRoute gates={['owner']}><Register /></ProtectedRoute>} />

      {/* Subadmin routes */}
      <Route path="/subadmin/dashboard" element={<ProtectedRoute gates={['delegate']}><SubadminDashboard /></ProtectedRoute>} />
      <Route path="/subadmin/users" element={<ProtectedRoute gates={['delegate']}><ManageUsers /></ProtectedRoute>} />
      <Route path="/subadmin/tickets" element={<ProtectedRoute gates={['delegate']}><StaffTicketsPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/modules" element={<ProtectedRoute gates={['delegate']}><ManageModulesPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/roles" element={<ProtectedRoute gates={['delegate']}><ManageRolesPage /></ProtectedRoute>} />
      <Route path="/subadmin/rbac/permissions" element={<ProtectedRoute gates={['delegate']}><ManagePermissions /></ProtectedRoute>} />
      <Route path="/subadmin/subadmins" element={<ProtectedRoute gates={['delegate']}><ManageSubadmins /></ProtectedRoute>} />
      <Route path="/subadmin/create-subadmin" element={<ProtectedRoute gates={['delegate']}><Register /></ProtectedRoute>} />

      {/* User routes */}
      <Route path="/user/dashboard" element={<ProtectedRoute gates={['member']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/tickets/create" element={<ProtectedRoute gates={['member']}><UserCreateTicketPage /></ProtectedRoute>} />
      <Route path="/tickets/my" element={<ProtectedRoute gates={['member']}><UserMyTicketsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute gates={['delegate', 'member']}><Profile /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute gates={['delegate', 'member']}><ChangePassword /></ProtectedRoute>} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes>
);