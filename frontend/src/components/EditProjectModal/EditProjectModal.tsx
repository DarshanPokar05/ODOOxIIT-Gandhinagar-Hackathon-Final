import React, { useState } from 'react';
import './EditProjectModal.css';

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

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  project, 
  onProjectUpdated 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    deadline: '',
    status: 'planned',
    priority: 'medium',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        budget: project.budget?.toString() || '',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        status: project.status || 'planned',
        priority: project.priority || 'medium',
        tags: project.tags || []
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          tags: JSON.stringify(formData.tags)
        })
      });

      const data = await response.json();

      if (response.ok) {
        onProjectUpdated();
        onClose();
      } else {
        setError(data.message || 'Failed to update project');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Project</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tags-input">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button type="button" onClick={addTag}>Add</button>
            </div>
            <div className="tags-list">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;