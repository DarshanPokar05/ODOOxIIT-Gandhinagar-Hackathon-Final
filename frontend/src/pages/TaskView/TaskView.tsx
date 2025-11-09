import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Task {
  id: number;
  task_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_name: string;
  assignee_email: string;
  role: string;
  created_at: string;
  updated_at: string;
  deadline: string;
  subtask_count: number;
  completed_subtasks: number;
  comment_count: number;
  total_hours: number;
}

interface TaskViewProps {
  projectId: number;
  onClose: () => void;
  canCreate?: boolean;
}

const TaskView: React.FC<TaskViewProps> = ({ projectId, onClose, canCreate = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    deadline: '',
    estimated_hours: '',
    role: '',
    status: 'pending'
  });
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    deadline: '',
    estimated_hours: '',
    role: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/team-members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await axios.get(`http://localhost:5000/api/tasks/project/${projectId}${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/tasks/${taskId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      handleStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusTasks = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/tasks', {
        ...newTaskData,
        project_id: projectId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowNewTaskForm(false);
      setNewTaskData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        deadline: '',
        estimated_hours: '',
        role: '',
        status: 'pending'
      });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assignee_name ? '1' : '', // Simplified for demo
      priority: task.priority,
      deadline: task.deadline || '',
      estimated_hours: '',
      role: task.role || '',
      status: task.status
    });
    setShowEditTaskForm(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/tasks/${editingTask.id}`, editTaskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowEditTaskForm(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, task)}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
    >
      {/* Edit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEditTask(task);
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          cursor: 'pointer',
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        ✏️ Edit
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingRight: '50px' }}>
        <div onClick={() => setSelectedTask(task)}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>{task.title}</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{task.task_id}</p>
        </div>
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
      </div>

      {/* Assignee */}
      <div onClick={() => setSelectedTask(task)} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '10px',
          fontWeight: '600'
        }}>
          {task.assignee_name?.charAt(0) || 'U'}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '500' }}>{task.assignee_name || 'Unassigned'}</div>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{task.role || 'No Role'}</div>
        </div>
      </div>

      {/* Description Preview */}
      <p onClick={() => setSelectedTask(task)} style={{ 
        margin: '0 0 12px 0', 
        fontSize: '12px', 
        color: '#6b7280',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {task.description || 'No description'}
      </p>

      {/* Stats */}
      <div onClick={() => setSelectedTask(task)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          📋 {task.completed_subtasks}/{task.subtask_count} subtasks
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          💬 {task.comment_count} comments
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          ⏱️ {task.total_hours}h logged
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          📅 {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
        </div>
      </div>

      {/* Timestamps */}
      <div onClick={() => setSelectedTask(task)} style={{ fontSize: '10px', color: '#9ca3af' }}>
        <div>Created: {formatDate(task.created_at)}</div>
        <div>Updated: {formatDate(task.updated_at)}</div>
      </div>
    </div>
  );

  const KanbanColumn: React.FC<{ title: string; status: string; tasks: Task[] }> = ({ title, status, tasks }) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, status)}
      style={{
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        minHeight: '600px'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e2e8f0'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{title}</h3>
        <span style={{
          backgroundColor: '#e2e8f0',
          color: '#6b7280',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {tasks.length}
        </span>
      </div>
      
      <div>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );

  if (loading) return <div>Loading tasks...</div>;

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
        width: '95%',
        height: '95%',
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Task Board</h1>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Project #{projectId} Tasks</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {canCreate && (
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
                + New Task
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '16px 30px', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            placeholder="Search tasks by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchTasks()}
            style={{
              width: '300px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={fetchTasks}
            style={{
              marginLeft: '8px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔍 Search
          </button>
        </div>

        {/* Kanban Board */}
        <div style={{ flex: 1, padding: '20px 30px', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            <KanbanColumn title="New" status="pending" tasks={getStatusTasks('pending')} />
            <KanbanColumn title="In Progress" status="in_progress" tasks={getStatusTasks('in_progress')} />
            <KanbanColumn title="Blocked" status="blocked" tasks={getStatusTasks('blocked')} />
            <KanbanColumn title="Done" status="completed" tasks={getStatusTasks('completed')} />
          </div>
        </div>
      </div>
      
  {/* New Task Form */}
  {canCreate && showNewTaskForm && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0' }}>Create New Task</h2>
            
            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Title *</label>
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
                <textarea
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Priority</label>
                  <select
                    value={newTaskData.priority}
                    onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Status</label>
                  <select
                    value={newTaskData.status}
                    onChange={(e) => setNewTaskData({ ...newTaskData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="pending">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Done</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Assignee</label>
                <select
                  value={newTaskData.assigned_to}
                  onChange={(e) => setNewTaskData({ ...newTaskData, assigned_to: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                >
                  <option value="">Select Assignee</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Deadline</label>
                  <input
                    type="date"
                    value={newTaskData.deadline}
                    onChange={(e) => setNewTaskData({ ...newTaskData, deadline: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Estimated Hours</label>
                  <input
                    type="number"
                    value={newTaskData.estimated_hours}
                    onChange={(e) => setNewTaskData({ ...newTaskData, estimated_hours: e.target.value })}
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Role</label>
                <input
                  type="text"
                  value={newTaskData.role}
                  onChange={(e) => setNewTaskData({ ...newTaskData, role: e.target.value })}
                  placeholder="e.g., UI Dev, Backend Dev, QA"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewTaskForm(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Task Form */}
      {showEditTaskForm && editingTask && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0' }}>Edit Task: {editingTask.task_id}</h2>
            
            <form onSubmit={handleUpdateTask}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Title *</label>
                <input
                  type="text"
                  value={editTaskData.title}
                  onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
                <textarea
                  value={editTaskData.description}
                  onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Priority</label>
                  <select
                    value={editTaskData.priority}
                    onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Status</label>
                  <select
                    value={editTaskData.status}
                    onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="pending">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Done</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Role</label>
                <input
                  type="text"
                  value={editTaskData.role}
                  onChange={(e) => setEditTaskData({ ...editTaskData, role: e.target.value })}
                  placeholder="e.g., UI Dev, Backend Dev, QA"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Deadline</label>
                <input
                  type="date"
                  value={editTaskData.deadline}
                  onChange={(e) => setEditTaskData({ ...editTaskData, deadline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTaskForm(false);
                    setEditingTask(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskView;