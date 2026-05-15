import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SidebarProvider } from '../context/SidebarContext';
import { PermissionProvider } from '../context/PermissionContext';
import { TicketSocketSession } from '../context/TicketSocketSession';


export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PermissionProvider>
        <TicketSocketSession />
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </PermissionProvider>
    </AuthProvider>
  );
};