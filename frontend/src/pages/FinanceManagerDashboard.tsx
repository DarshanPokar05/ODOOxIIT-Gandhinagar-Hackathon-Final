import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import ProfileDropdown from '../components/ProfileDropdown/ProfileDropdown';

interface FinanceDashboardData {
  kpis: {
    pendingExpenses: number;
    totalExpenses: number;
  };
  recentExpenses: any[];
}

const FinanceManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dashboard/finance-manager', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar activeSection="dashboard" onSectionChange={() => {}} />
      
      <div style={{ marginLeft: '256px', flex: 1 }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Finance Dashboard</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Manage expenses and financial approvals
            </p>
          </div>
          <ProfileDropdown />
        </div>
        
        <div style={{ padding: '32px' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Pending Expenses</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>
                {dashboardData?.kpis.pendingExpenses || 0}
              </p>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Total Expenses</h3>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>
                ${dashboardData?.kpis.totalExpenses?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Recent Expenses */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Recent Expenses</h2>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Expense
                    </th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Project
                    </th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Amount
                    </th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Submitted By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.recentExpenses.map((expense) => (
                    <tr key={expense.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px 24px' }}>{expense.expense_number}</td>
                      <td style={{ padding: '16px 24px' }}>{expense.project_name}</td>
                      <td style={{ padding: '16px 24px' }}>${expense.amount}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: expense.status === 'approved' ? '#dcfce7' : '#dbeafe',
                          color: expense.status === 'approved' ? '#166534' : '#1e40af'
                        }}>
                          {expense.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>{expense.submitted_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceManagerDashboard;