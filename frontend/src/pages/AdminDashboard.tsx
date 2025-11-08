import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar/Sidebar';
import KPIWidget from '../components/KPIWidget/KPIWidget';
import ProjectCard from '../components/ProjectCard/ProjectCard';
import ProfileDropdown from '../components/ProfileDropdown/ProfileDropdown';
import NewProjectForm from '../components/NewProjectForm/NewProjectForm';
import ProjectDetail from '../components/ProjectDetail/ProjectDetail';
import UserManagementPage from './UserManagementPage';
import TaskView from './TaskView/TaskView';
import EditProjectModal from '../components/EditProjectModal/EditProjectModal';
import AnalyticsPage from './AnalyticsPage';

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  deadline: string;
  manager_name: string;
  manager_id: number;
  tags: string[];
  image_url: string;
  task_count: number;
  budget: number;
  priority: string;
}

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showTaskView, setShowTaskView] = useState(false);
  const [taskViewProjectId, setTaskViewProjectId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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

  const filteredProjects = dashboardData?.projects?.filter((project: Project) => 
    statusFilter === 'all' || project.status === statusFilter
  ) || [];

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:5000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        fetchDashboardData(); // Refresh the data
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleProjectClick = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const handleProjectCreated = () => {
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dashboard/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <div style={{ marginLeft: '250px', flex: 1 }}>
        {/* Top Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>Dashboard</h1>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Welcome back, Admin</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setShowNewProjectForm(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + New Project
            </button>
            <ProfileDropdown />
          </div>
        </div>
        
        <div style={{ padding: '30px' }}>
        {activeSection === 'dashboard' && (
          <>
            {/* KPI Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <KPIWidget 
                title="Total Projects" 
                value={dashboardData?.kpis?.totalProjects || 0} 
                icon="📊" 
                color="#dbeafe" 
              />
              <KPIWidget 
                title="Active Projects" 
                value={dashboardData?.kpis?.activeProjects || 0} 
                icon="🚀" 
                color="#dcfce7" 
              />
              <KPIWidget 
                title="Total Revenue" 
                value={`$${(dashboardData?.kpis?.totalRevenue || 0).toLocaleString()}`} 
                icon="💰" 
                color="#fef3c7" 
              />
              <KPIWidget 
                title="Total Cost" 
                value={`$${(dashboardData?.kpis?.totalCost || 0).toLocaleString()}`} 
                icon="💸" 
                color="#fecaca" 
              />
              <KPIWidget 
                title="Total Profit" 
                value={`$${(dashboardData?.kpis?.totalProfit || 0).toLocaleString()}`} 
                icon="📈" 
                color="#d1fae5" 
              />
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['all', 'planned', 'in_progress', 'completed', 'on_hold'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: statusFilter === status ? '#3b82f6' : 'white',
                      color: statusFilter === status ? 'white' : '#6b7280',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: statusFilter === status ? '500' : '400',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {status === 'all' ? 'All Projects' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredProjects.map((project: Project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onClick={handleProjectClick}
                />
              ))}
            </div>
          </>
        )}



        {activeSection === 'tasks' && (
          <div>
            <h1>Task Management</h1>
            <p>Assign and track task execution across all projects.</p>
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

        {activeSection === 'analytics' && (
          <AnalyticsPage />
        )}

        {activeSection === 'users' && (
          <UserManagementPage />
        )}
        </div>
      </div>
      
      <NewProjectForm 
        isOpen={showNewProjectForm}
        onClose={() => setShowNewProjectForm(false)}
        onProjectCreated={handleProjectCreated}
      />
      
      {selectedProjectId && (
        <ProjectDetail 
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
      
      {showTaskView && taskViewProjectId && (
        <TaskView 
          projectId={taskViewProjectId}
          onClose={() => {
            setShowTaskView(false);
            setTaskViewProjectId(null);
          }}
        />
      )}
      
      <EditProjectModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onProjectUpdated={fetchDashboardData}
      />
    </div>
  );
};

export default AdminDashboard;