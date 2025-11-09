import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import ProfileDropdown from '../components/ProfileDropdown/ProfileDropdown';
import TaskView from './TaskView/TaskView';

interface Task {
  id: number;
  task_id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  project_id: number;
  project_name: string;
  project_status: string;
  hours_logged: number;
}

interface Project {
  id: number;
  name: string;
  status: string;
  my_task_count: number;
  completed_task_count: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  status: string;
  project_name: string;
  created_at: string;
}

const TeamMemberDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showTaskView, setShowTaskView] = useState(false);
  const [taskViewProjectId, setTaskViewProjectId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dashboard/team-member', {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'blocked': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading dashboard...
      </div>
    );
  }

  const {
    kpis = {},
    recentTasks = [],
    activeProjects = [],
    recentExpenses = [],
    upcomingDeadlines = []
  } = dashboardData || {};

  return (
    <div style={{ display: 'flex', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>My Dashboard</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Welcome back, {user?.firstName} {user?.lastName}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ProfileDropdown />
          </div>
        </div>
        
        <div style={{ padding: '32px' }}>
          {activeSection === 'tasks' && (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Task Management</h1>
              <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 24px 0' }}>View tasks for your active projects.</p>
              <div style={{ marginTop: '20px' }}>
                <h3>Select a project to view tasks:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  {activeProjects?.map((project: any) => (
                    <div
                      key={project.id}
                      onClick={() => { setTaskViewProjectId(project.id); setShowTaskView(true); }}
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
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{project.my_task_count} tasks • {project.completed_task_count} completed</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'dashboard' && (
          <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px', 
            marginBottom: '32px' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>📋</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Total Tasks</h3>
              </div>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>
                {kpis?.myTasks || 0}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                {kpis?.inProgressTasks || 0} in progress
              </p>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>✅</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Completed</h3>
              </div>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                {kpis?.completedTasks || 0}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                {kpis?.pendingTasks || 0} pending
              </p>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>⏱️</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Hours Logged</h3>
              </div>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
                {kpis?.totalHoursLogged || 0}h
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                This month
              </p>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>💰</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Expenses</h3>
              </div>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                {formatCurrency(kpis?.totalExpenseAmount || 0)}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                {kpis?.myExpenses || 0} submissions
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  padding: '24px 24px 0 24px', 
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                    Recent Tasks
                  </h2>
                </div>
                <div style={{ padding: '0 24px 24px 24px' }}>
                  {recentTasks && recentTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recentTasks.map((task: Task) => (
                        <div 
                          key={task.id}
                          onClick={() => navigate(`/tasks/${task.project_id || 1}`)}
                          style={{ 
                            padding: '16px', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: '#f8fafc'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                {task.title}
                              </h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                {task.task_id} • {task.project_name}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: `${getStatusColor(task.status)}20`,
                                color: getStatusColor(task.status),
                                textTransform: 'capitalize'
                              }}>
                                {task.status.replace('_', ' ')}
                              </span>
                              {task.priority && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  backgroundColor: `${getPriorityColor(task.priority)}20`,
                                  color: getPriorityColor(task.priority),
                                  textTransform: 'uppercase'
                                }}>
                                  {task.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              ⏱️ {task.hours_logged}h logged
                            </span>
                            {task.deadline && (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                📅 Due: {formatDate(task.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>
                      No tasks assigned yet
                    </p>
                  )}
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  padding: '24px 24px 0 24px', 
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                    Active Projects
                  </h2>
                </div>
                <div style={{ padding: '0 24px 24px 24px' }}>
                  {activeProjects && activeProjects.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeProjects.map((project: Project) => (
                        <div key={project.id} style={{ 
                          padding: '16px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc'
                        }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                            {project.name}
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#64748b' }}>
                              {project.completed_task_count}/{project.my_task_count} tasks completed
                            </span>
                            <div style={{
                              width: '60px',
                              height: '6px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${(project.completed_task_count / project.my_task_count) * 100}%`,
                                height: '100%',
                                backgroundColor: '#10b981',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>
                      No active projects
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  padding: '20px 20px 0 20px', 
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                    Upcoming Deadlines
                  </h3>
                </div>
                <div style={{ padding: '0 20px 20px 20px' }}>
                  {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {upcomingDeadlines.map((task: Task) => (
                        <div key={task.id} style={{ 
                          padding: '12px', 
                          border: '1px solid #fef3c7', 
                          borderRadius: '6px',
                          backgroundColor: '#fffbeb'
                        }}>
                          <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                            {task.title}
                          </h5>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#78716c' }}>
                            {task.project_name}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#d97706', fontWeight: '500' }}>
                            📅 {formatDate(task.deadline)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
                      No upcoming deadlines
                    </p>
                  )}
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  padding: '20px 20px 0 20px', 
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                    Recent Expenses
                  </h3>
                </div>
                <div style={{ padding: '0 20px 20px 20px' }}>
                  {recentExpenses && recentExpenses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recentExpenses.map((expense: Expense) => (
                        <div key={expense.id} style={{ 
                          padding: '12px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                              {expense.description}
                            </h5>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                              {formatCurrency(expense.amount)}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                            {expense.project_name}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '10px',
                              fontWeight: '600',
                              backgroundColor: expense.status === 'approved' ? '#dcfce720' : '#fef3c720',
                              color: expense.status === 'approved' ? '#166534' : '#92400e',
                              textTransform: 'capitalize'
                            }}>
                              {expense.status}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                              {formatDate(expense.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
                      No expenses submitted
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
        {showTaskView && taskViewProjectId && (
          <TaskView
            projectId={taskViewProjectId}
            onClose={() => { setShowTaskView(false); setTaskViewProjectId(null); fetchDashboardData(); }}
            canCreate={false}
          />
        )}
      </div>
    </div>
  );
};

export default TeamMemberDashboard;