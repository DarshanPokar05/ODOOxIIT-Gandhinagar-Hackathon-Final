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
import ProductsPage from './ProductsPage';
import SalesOrdersPage from './SalesOrders/SalesOrdersPage';
import PurchaseOrdersPage from './PurchaseOrders/PurchaseOrdersPage';
import InvoicesPage from './Invoices/InvoicesPage';
import VendorBillsPage from './VendorBills/VendorBillsPage';
import ExpensesPage from './Expenses/ExpensesPage';

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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Dashboard</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Manage all your projects in one place</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setShowNewProjectForm(true)}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(160, 80, 140, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(160, 80, 140, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(160, 80, 140, 0.2)';
              }}
            >
              + New Project
            </button>
            <ProfileDropdown />
          </div>
        </div>
        
        <div style={{ padding: '32px' }}>
        {activeSection === 'dashboard' && (
          <>
            {/* KPI Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
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

            {/* Project Tabs */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'all', label: 'All Projects', count: dashboardData?.projects?.length || 0 },
                  { key: 'planned', label: 'Planned', count: dashboardData?.projects?.filter((p: any) => p.status === 'planned').length || 0 },
                  { key: 'in_progress', label: 'In Progress', count: dashboardData?.projects?.filter((p: any) => p.status === 'in_progress').length || 0 },
                  { key: 'completed', label: 'Completed', count: dashboardData?.projects?.filter((p: any) => p.status === 'completed').length || 0 },
                  { key: 'on_hold', label: 'On Hold', count: dashboardData?.projects?.filter((p: any) => p.status === 'on_hold').length || 0 }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: statusFilter === tab.key ? 'rgb(160, 80, 140)' : 'transparent',
                      color: statusFilter === tab.key ? 'white' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: statusFilter === tab.key ? '500' : '400',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      backgroundColor: statusFilter === tab.key ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      color: statusFilter === tab.key ? 'white' : '#64748b',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
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
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Task Management</h1>
            <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 24px 0' }}>Assign and track task execution across all projects.</p>
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

        {activeSection === 'products' && (
          <ProductsPage />
        )}

        {activeSection === 'sales-orders' && (
          <SalesOrdersPage />
        )}

        {activeSection === 'purchase-orders' && (
          <PurchaseOrdersPage />
        )}

        {activeSection === 'invoices' && (
          <InvoicesPage />
        )}

        {activeSection === 'vendor-bills' && (
          <VendorBillsPage />
        )}

        {activeSection === 'expenses' && (
          <ExpensesPage />
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
          canCreate={true}
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