import React from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'projects', label: 'All Projects', icon: '📋' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'managers', label: 'Managers', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{ 
      width: '250px', 
      height: '100vh', 
      backgroundColor: '#1e293b', 
      color: 'white', 
      padding: '0',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      {/* Logo Section */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#3b82f6',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          PM
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>ProjectManager</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Project Management</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '20px 0' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#94a3b8', 
          fontWeight: '600', 
          padding: '0 20px', 
          marginBottom: '15px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          NAVIGATION
        </div>
        
        {menuItems.map(item => (
          <div
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              backgroundColor: activeSection === item.id ? '#3b82f6' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: activeSection === item.id ? 'white' : '#cbd5e1',
              fontSize: '14px',
              fontWeight: activeSection === item.id ? '500' : '400',
              borderRight: activeSection === item.id ? '3px solid #60a5fa' : 'none'
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