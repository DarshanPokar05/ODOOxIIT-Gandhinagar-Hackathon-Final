import React, { useState } from 'react';

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

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: number) => void;
  onClick?: (projectId: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return { bg: '#fef3c7', color: '#92400e', label: 'Planned' };
      case 'in_progress': return { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' };
      case 'completed': return { bg: '#d1fae5', color: '#065f46', label: 'Completed' };
      case 'on_hold': return { bg: '#fee2e2', color: '#991b1b', label: 'On Hold' };
      default: return { bg: '#f1f5f9', color: '#64748b', label: status };
    }
  };

  const getProgressPercentage = () => {
    // Mock progress calculation based on status
    switch (project.status) {
      case 'planned': return Math.floor(Math.random() * 20);
      case 'in_progress': return 20 + Math.floor(Math.random() * 60);
      case 'completed': return 100;
      case 'on_hold': return Math.floor(Math.random() * 40);
      default: return 0;
    }
  };

  const statusInfo = getStatusColor(project.status);
  const progress = getProgressPercentage();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onClick={() => onClick?.(project.id)}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* Header with Status */}
      <div style={{ padding: '20px 20px 0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div
            style={{
              backgroundColor: statusInfo.bg,
              color: statusInfo.color,
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {statusInfo.label}
          </div>
          
          {/* Three dots menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '36px',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '120px',
                zIndex: 10
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(project);
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(project.id);
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#ef4444'
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '20px', 
          fontWeight: '600', 
          color: '#1e293b',
          lineHeight: '1.3'
        }}>
          {project.name}
        </h3>

        {/* Progress Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Progress</span>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{progress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#f1f5f9',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, rgb(160, 80, 140) 0%, rgb(180, 100, 160) 100%)',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Budget and Spent */}
      <div style={{ padding: '0 20px 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Budget</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              ${project.budget?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Spent</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              ${Math.floor((project.budget || 0) * (progress / 100)).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Deadline and Manager */}
      <div style={{ 
        padding: '16px 20px 20px 20px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>📅</div>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {new Date(project.deadline).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {project.manager_name?.split(' ').map(n => n[0]).join('') || 'M'}
          </div>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {project.manager_name?.split(' ')[0] || 'Manager'}
          </span>
        </div>
      </div>

      {/* View Project Button */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(project.id);
          }}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          View Project
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;