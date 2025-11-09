import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  
  const getDashboardRoute = () => {
    switch (user?.role) {
      case 'admin': return '/dashboard/admin';
      case 'project_manager': return '/dashboard/project-manager';
      case 'finance_manager': return '/dashboard/finance-manager';
      default: return '/dashboard/team-member';
    }
  };
  
  const handleNavigation = (section: string) => {
    onSectionChange(section);
    
    switch (section) {
      case 'dashboard':
        navigate(getDashboardRoute());
        break;

      case 'tasks':
        // Navigate to dashboard and set tasks section
        switch (user?.role) {
          case 'admin':
            navigate('/dashboard/admin');
            break;
          case 'project_manager':
            navigate('/dashboard/project-manager');
            break;
          default:
            navigate('/dashboard/team-member');
            break;
        }
        break;
      case 'analytics':
        // TODO: Add analytics page route
        break;
      case 'sales-orders':
        // TODO: Add sales orders page route
        break;
      case 'purchase-orders':
        navigate('/purchase-orders');
        break;
      case 'invoices':
        // TODO: Add invoices page route
        break;
      case 'vendor-bills':
        // TODO: Add vendor bills page route
        break;
      case 'expenses':
        navigate('/expenses');
        break;
      case 'users':
        // TODO: Add users management page route
        break;
      case 'products':
        // TODO: Add products page route
        break;
      default:
        break;
    }
  };
  
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    ];
    
    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { id: 'tasks', label: 'Tasks', icon: '✓' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
      ];
    }
    
    if (user?.role === 'project_manager') {
      return [
        ...baseItems,
        { id: 'tasks', label: 'Team Tasks', icon: '✓' },
      ];
    }
    
    if (user?.role === 'team_member') {
      return [
        ...baseItems,
        { id: 'tasks', label: 'My Tasks', icon: '✓' },
      ];
    }
    
    if (user?.role === 'finance_manager') {
      return [
        ...baseItems,
        { id: 'analytics', label: 'Finance Reports', icon: '📈' },
      ];
    }
    
    return baseItems;
  };

  const getSettingsItems = () => {
    const items = [];
    
    if (user?.role === 'admin') {
      items.push(
        { id: 'sales-orders', label: 'Sales Orders', icon: '📋' },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' },
        { id: 'invoices', label: 'Customer Invoices', icon: '📄' },
        { id: 'vendor-bills', label: 'Vendor Bills', icon: '📜' },
        { id: 'expenses', label: 'Expenses', icon: '💰' },
        { id: 'users', label: 'Manage Users', icon: '👥' },
        { id: 'products', label: 'Products', icon: '📦' }
      );
    } else if (user?.role === 'project_manager') {
      items.push(
        { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' },
        { id: 'expenses', label: 'Team Expenses', icon: '💰' }
      );
    } else if (user?.role === 'team_member') {
      items.push(
        { id: 'expenses', label: 'My Expenses', icon: '💰' }
      );
    } else if (user?.role === 'finance_manager') {
      items.push(
        { id: 'invoices', label: 'Invoices', icon: '📄' },
        { id: 'vendor-bills', label: 'Vendor Bills', icon: '📜' },
        { id: 'expenses', label: 'Expense Approvals', icon: '💰' }
      );
    }
    
    return items;
  };
  
  const menuItems = getMenuItems();
  const settingsItems = getSettingsItems();

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
            onClick={() => handleNavigation(item.id)}
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
            onClick={() => handleNavigation(item.id)}
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