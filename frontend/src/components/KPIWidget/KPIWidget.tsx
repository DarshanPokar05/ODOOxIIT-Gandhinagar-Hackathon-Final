import React from 'react';

interface KPIWidgetProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ title, value, icon, color }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e1e5e9',
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '10px',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
          {title}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default KPIWidget;