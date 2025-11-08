import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/dashboard/admin', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Dashboard</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Welcome, {user?.firstName} {user?.lastName}</span>
          <button onClick={logout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{dashboardData?.data?.totalUsers}</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>Active Projects</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{dashboardData?.data?.activeProjects}</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3>System Health</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{dashboardData?.data?.systemHealth}</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <h3>Recent Activity</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {dashboardData?.data?.recentActivity?.map((activity: string, index: number) => (
            <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #dee2e6' }}>
              {activity}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;