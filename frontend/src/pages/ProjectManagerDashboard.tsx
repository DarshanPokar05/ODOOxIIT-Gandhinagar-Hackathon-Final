import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import ProfileDropdown from '../components/ProfileDropdown/ProfileDropdown';
import PurchaseOrdersPage from './PurchaseOrders/PurchaseOrdersPage';
import TaskView from './TaskView/TaskView';
import CreateTaskModal from '../components/CreateTaskModal/CreateTaskModal';

const ProjectManagerDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const { user } = useAuth();

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const [showTaskView, setShowTaskView] = useState(false);
  const [taskViewProjectId, setTaskViewProjectId] = useState<number | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

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
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.kpis?.myProjects ?? 0}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Active Tasks</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.kpis?.activeTasks ?? 0}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Pending Expenses</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{dashboardData?.kpis?.pendingExpenses ?? 0}</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Completed Tasks</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                    {dashboardData?.projects?.reduce((acc: any, p: any) => acc + (p.completed_tasks ? parseInt(p.completed_tasks) : 0), 0) ?? 0}
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>My Projects</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {dashboardData?.projects?.map((project: any, index: number) => (
                    <li key={project.id} style={{ padding: '12px 0', borderBottom: index < (dashboardData.projects?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none', color: '#64748b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{project.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Manager: {project.manager_name || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>{project.task_count ?? 0} tasks</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{project.completed_tasks ?? 0} completed</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeSection === 'tasks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Task Management</h1>
                  <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 24px 0' }}>Assign and track task execution across your projects.</p>
                </div>
                <div>
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + New Task
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <h3>Select a project to view tasks:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  {dashboardData?.projects?.map((project: any) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setTaskViewProjectId(project.id);
                        setShowTaskView(true);
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <h4 style={{ margin: '0 0 8px 0' }}>{project.name}</h4>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                        {project.task_count} tasks • Manager: {project.manager_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showCreateTaskModal && (
            <CreateTaskModal
              isOpen={showCreateTaskModal}
              onClose={() => setShowCreateTaskModal(false)}
              onTaskCreated={() => {
                setShowCreateTaskModal(false);
                fetchDashboardData();
              }}
            />
          )}

          {showTaskView && taskViewProjectId && (
            <TaskView
              projectId={taskViewProjectId}
              onClose={() => {
                setShowTaskView(false);
                setTaskViewProjectId(null);
                fetchDashboardData();
              }}
              canCreate={true}
            />
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