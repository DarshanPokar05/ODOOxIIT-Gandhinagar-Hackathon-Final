import React from 'react';
import { useAuth } from '../context/AuthContext';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  allowedRoles, 
  children, 
  fallback 
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div style={{ 
        padding: '48px', 
        textAlign: 'center', 
        backgroundColor: 'white', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
          Access Denied
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          You don't have permission to access this page. Only admin and finance manager can view sales orders.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;