import React from 'react';

interface KPIWidgetProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ title, value, icon, color }) => {
  // Generate trend indicator (mock data)
  const getTrendData = () => {
    const trends = [
      { change: '+2 from last month', positive: true },
      { change: '-3 from last week', positive: false },
      { change: '+124 this month', positive: true },
      { change: '+₹2.3L this month', positive: true }
    ];
    return trends[Math.floor(Math.random() * trends.length)];
  };

  const trend = getTrendData();

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* Header with Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            {icon}
          </div>
          <span style={{ 
            fontSize: '14px', 
            color: '#64748b', 
            fontWeight: '500'
          }}>
            {title}
          </span>
        </div>
        
        {/* Info Icon */}
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#64748b'
        }}>
          ℹ
        </div>
      </div>

      {/* Main Value */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1e293b',
          lineHeight: '1.2'
        }}>
          {value}
        </div>
      </div>

      {/* Trend Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          fontSize: '12px',
          color: trend.positive ? '#10b981' : '#ef4444',
          fontWeight: '500'
        }}>
          {trend.positive ? '↗' : '↘'}
        </span>
        <span style={{
          fontSize: '12px',
          color: trend.positive ? '#10b981' : '#ef4444',
          fontWeight: '500'
        }}>
          {trend.change}
        </span>
      </div>
    </div>
  );
};

export default KPIWidget;