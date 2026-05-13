import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { TicketSocketSession } from '../context/TicketSocketSession';
import { SidebarProvider } from '../context/SidebarContext';
import { PermissionProvider } from '../context/PermissionContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <TicketSocketSession />
      <PermissionProvider>
        <SidebarProvider>
        {children}
      </SidebarProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};