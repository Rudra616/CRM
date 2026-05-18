import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SidebarProvider } from '../context/SidebarContext';
import { PermissionProvider } from '../context/PermissionContext';


export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PermissionProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};