import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminLogin from "./pages/admin/AdminLogin";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";
import SubadminDashboard from "./pages/subadmin/SubadminDashboard";
import ManageUsers from "./pages/ManageUsers";
import ManageSubadmin from "./pages/admin/subadmins";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ServerDownOverlay from "./components/ServerDownOverlay";
import { subscribe, checkHealth } from "./serverStatus";
import { SidebarProvider } from "./context/SidebarContext";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

/** App - role-based routing; ToastContainer required for toast notifications */
const App: React.FC = () => {
  const [serverDown, setServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const attemptRecovery = useCallback(async () => {
    setIsChecking(true);
    try {
      await checkHealth();
      setServerDown(false);
    } catch {
      // stay down
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => setServerDown(true));
    return unsub;
  }, []);

  useEffect(() => {
    checkHealth().catch(() => setServerDown(true));
  }, []);

  useEffect(() => {
    if (!serverDown) return;
    const id = setInterval(attemptRecovery, 5000);
    return () => clearInterval(id);
  }, [serverDown, attemptRecovery]);

  if (serverDown) {
    return (
      <>
        <ServerDownOverlay onRetry={attemptRecovery} isChecking={isChecking} />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          closeButton
          theme="colored"
        />
      </>
    );
  }

  return (
    <BrowserRouter>
      <SidebarProvider>
        <Navbar />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={["admin"]} loginPath="/admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute roles={["admin"]} loginPath="/admin">
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subadmins"
              element={
                <ProtectedRoute roles={["admin"]} loginPath="/admin">
                  <ManageSubadmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/create-subadmin"
              element={
                <ProtectedRoute roles={["admin"]} loginPath="/admin">
                  <Register />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute roles={["admin"]} loginPath="/admin">
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={["subadmin", "user"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["subadmin"]}>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/dashboard"
              element={
                <ProtectedRoute roles={["user"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subadmin/dashboard"
              element={
                <ProtectedRoute roles={["subadmin"]}>
                  <SubadminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          closeButton
          theme="colored"
        />
      </SidebarProvider>
    </BrowserRouter>
  );
};

export default App;
