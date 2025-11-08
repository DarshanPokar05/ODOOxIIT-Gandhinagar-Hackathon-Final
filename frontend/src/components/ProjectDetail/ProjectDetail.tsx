import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  hours_logged: number;
  estimated_hours: number;
  assigned_to: number;
  assigned_name: string;
}

interface ProjectDetailProps {
  projectId: number;
  onClose: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onClose }) => {
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const [projectRes, tasksRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/projects/${projectId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'on_hold': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getProgressPercentage = () => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getBudgetUsage = () => {
    const totalHours = tasks.reduce((sum, task) => sum + task.hours_logged, 0);
    const hourlyRate = 50; // Mock hourly rate
    const usedBudget = totalHours * hourlyRate;
    const budgetPercentage = project?.budget ? Math.round((usedBudget / project.budget) * 100) : 0;
    return { usedBudget, budgetPercentage };
  };

  const mockInvoices = [
    { id: 1, amount: 15000, description: 'Initial Payment' },
    { id: 2, amount: 25000, description: 'Milestone 1' },
    { id: 3, amount: 35000, description: 'Milestone 2' }
  ];

  const mockExpenses = [
    { category: 'Software Licenses', amount: 5000 },
    { category: 'Hardware', amount: 8000 },
    { category: 'Travel', amount: 2000 }
  ];

  if (loading) return <div>Loading...</div>;

  const progress = getProgressPercentage();
  const { usedBudget, budgetPercentage } = getBudgetUsage();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>{project?.name}</h1>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Project Manager: {project?.manager_name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowNewTaskForm(true)}
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
              + Add Task
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        {/* Quick Links Panel */}
        <div style={{
          padding: '16px 30px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '16px'
        }}>
          {['Sales Orders', 'Purchase Orders', 'Customer Invoices', 'Vendor Bills', 'Expenses'].map(link => (
            <button
              key={link}
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#6b7280'
              }}
            >
              {link}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel */}
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
            {/* Project Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Duration</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {project?.start_date && project?.deadline ? 
                    Math.ceil((new Date(project.deadline).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                    : 'N/A'
                  }
                </p>
              </div>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Total Tasks</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{tasks.length}</p>
              </div>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Hours Logged</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {tasks.reduce((sum, task) => sum + task.hours_logged, 0)}h
                </p>
              </div>
              
              <div 
                style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', position: 'relative' }}
                onMouseEnter={() => setShowTooltip('revenue')}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Revenue</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>$75,000</p>
                {showTooltip === 'revenue' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'black',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 10,
                    minWidth: '200px'
                  }}>
                    <div>Invoices:</div>
                    {mockInvoices.map(inv => (
                      <div key={inv.id}>• ${inv.amount.toLocaleString()} - {inv.description}</div>
                    ))}
                  </div>
                )}
              </div>
              
              <div 
                style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', position: 'relative' }}
                onMouseEnter={() => setShowTooltip('cost')}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>Cost</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>${usedBudget.toLocaleString()}</p>
                {showTooltip === 'cost' && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'black',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 10,
                    minWidth: '200px'
                  }}>
                    <div>Expense Breakdown:</div>
                    {mockExpenses.map(exp => (
                      <div key={exp.category}>• {exp.category}: ${exp.amount.toLocaleString()}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bars */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Project Progress</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: getStatusColor(project?.status),
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Budget Usage</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>{budgetPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}>
                  <div style={{
                    width: `${Math.min(budgetPercentage, 100)}%`,
                    height: '100%',
                    backgroundColor: budgetPercentage > 80 ? '#ef4444' : budgetPercentage > 60 ? '#f59e0b' : '#10b981',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Tasks</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    New Task
                  </button>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Edit Task
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {tasks.map(task => (
                  <div key={task.id} style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(task.status)
                          }}
                        />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{task.title}</h4>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: task.priority === 'high' ? '#fecaca' : task.priority === 'medium' ? '#fef3c7' : '#d1fae5',
                          color: task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#059669',
                          borderRadius: '12px',
                          fontSize: '10px',
                          textTransform: 'uppercase'
                        }}>
                          {task.priority}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                        Assigned to: {task.assigned_name || 'Unassigned'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {task.hours_logged}h / {task.estimated_hours}h
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'capitalize' }}>
                        {task.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;