import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import ProfileDropdown from '../components/ProfileDropdown/ProfileDropdown';
import PurchaseOrdersPage from './PurchaseOrders/PurchaseOrdersPage';

const ProjectManagerDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/dashboard/project-manager', {
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
    <div style={{ display: 'flex', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <div style={{ marginLeft: '256px', flex: 1 }}>
        {/* Top Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Project Manager Dashboard</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Manage your projects and team</p>
          </div>
          <ProfileDropdown />
        </div>
        
        <div style={{ padding: '32px' }}>
          {activeSection === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>My Projects</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.data?.myProjects}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Team Members</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.data?.teamMembers}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Pending Tasks</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.data?.pendingTasks}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Completed Tasks</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.data?.completedTasks}</p>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>My Projects</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {dashboardData?.data?.projects?.map((project: string, index: number) => (
                    <li key={index} style={{ padding: '12px 0', borderBottom: index < dashboardData.data.projects.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#64748b' }}>
                      {project}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeSection === 'purchase-orders' && (
            <PurchaseOrdersPage />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard;