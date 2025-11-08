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
      case 'planned': return '#ffc107';
      case 'in_progress': return '#007bff';
      case 'completed': return '#28a745';
      case 'on_hold': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return 'Planned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e1e5e9',
      overflow: 'hidden',
      position: 'relative',
      transition: 'transform 0.2s',
      cursor: 'pointer'
    }}
    onClick={() => onClick?.(project.id)}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Three dots menu */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ⋯
        </button>
        {showMenu && (
          <div style={{
            position: 'absolute',
            top: '35px',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: '80px'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(project);
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer'
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
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#dc3545'
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ padding: '15px 15px 0 15px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {project.tags?.map((tag, index) => (
            <span
              key={index}
              style={{
                backgroundColor: index === 0 ? '#d4edda' : '#f8d7da',
                color: index === 0 ? '#155724' : '#721c24',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Project Image */}
      <div style={{ padding: '0 15px' }}>
        <img
          src={project.image_url}
          alt={project.name}
          style={{
            width: '100%',
            height: '120px',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />
      </div>

      {/* Project Info */}
      <div style={{ padding: '15px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          {project.name}
        </h3>

        {/* Status and Deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>📅</span>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              {new Date(project.deadline).toLocaleDateString()}
            </span>
          </div>
          <div
            style={{
              backgroundColor: getStatusColor(project.status),
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {getStatusLabel(project.status)}
          </div>
        </div>

        {/* Manager and Tasks */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#007bff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {project.manager_name?.charAt(0) || 'M'}
            </div>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              {project.manager_name || 'No Manager'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>📋</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {project.task_count} tasks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;