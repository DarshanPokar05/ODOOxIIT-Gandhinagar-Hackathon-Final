import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user } = useAuth();
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  const settingsItems = [
    ...(user && ['admin', 'finance_manager'].includes(user.role) ? [{ id: 'sales-orders', label: 'Sales Orders', icon: '📋' }] : []),
    ...(user && ['admin', 'project_manager'].includes(user.role) ? [{ id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' }] : []),
    ...(user && ['admin', 'finance_manager'].includes(user.role) ? [{ id: 'invoices', label: 'Customer Invoices', icon: '📄' }] : []),
    ...(user && ['admin', 'project_manager'].includes(user.role) ? [{ id: 'vendor-bills', label: 'Vendor Bills', icon: '📜' }] : []),
    { id: 'expenses', label: 'Expenses', icon: '💰' },
    { id: 'users', label: 'Manage Users', icon: '👥' },
    { id: 'products', label: 'Products', icon: '📦' },
  ];

  return (
    <div style={{ 
      width: '256px', 
      height: '100vh', 
      backgroundColor: '#f8fafc', 
      color: '#1e293b', 
      padding: '0',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid #e2e8f0'
    }}>
      {/* Logo Section */}
      <div style={{ 
        padding: '24px 20px', 
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          ⚡
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'rgb(160, 80, 140)' }}>OneFlow</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Project Management</div>
        </div>
      </div>

      {/* Main Menu */}
      <div style={{ padding: '24px 0 16px 0' }}>
        <div style={{ 
          fontSize: '11px', 
          color: '#64748b', 
          fontWeight: '600', 
          padding: '0 20px', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Main Menu
        </div>
        
        {menuItems.map(item => (
          <div
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            style={{
              margin: '0 12px 4px 12px',
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: activeSection === item.id ? 'rgb(160, 80, 140)' : 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: activeSection === item.id ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: activeSection === item.id ? '500' : '400',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Settings Section */}
      <div style={{ padding: '16px 0' }}>
        <div style={{ 
          fontSize: '11px', 
          color: '#64748b', 
          fontWeight: '600', 
          padding: '0 20px', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Settings
        </div>
        
        {settingsItems.map(item => (
          <div
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            style={{
              margin: '0 12px 4px 12px',
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: activeSection === item.id ? 'rgb(160, 80, 140)' : 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: activeSection === item.id ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: activeSection === item.id ? '500' : '400',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>


    </div>
  );
};

export default Sidebar;