const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create project
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, budget, deadline, manager_id, status, priority, tags } = req.body;
    const parsedTags = JSON.parse(tags || '[]');
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO projects (name, description, budget, deadline, manager_id, status, priority, tags, image_url, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
       RETURNING *`,
      [name, description, parseFloat(budget), deadline, parseInt(manager_id), status, priority, parsedTags, imageUrl]
    );

    res.status(201).json({ message: 'Project created successfully', project: result.rows[0] });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get projects based on role
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT p.*, u.first_name || ' ' || u.last_name as manager_name,
             COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
    `;
    
    const params = [];
    
    // Role-based filtering
    if (req.user.role === 'project_manager') {
      query += ' WHERE p.manager_id = $1';
      params.push(req.user.id);
    } else if (req.user.role === 'team_member') {
      query += ' WHERE p.id IN (SELECT DISTINCT project_id FROM tasks WHERE assigned_to = $1)';
      params.push(req.user.id);
    }
    
    query += ' GROUP BY p.id, u.first_name, u.last_name ORDER BY p.created_at DESC';
    
    const projects = await pool.query(query, params);
    res.json(projects.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name as manager_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (project.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project tasks
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await pool.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name as assigned_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [id]);

    res.json(tasks.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager']),
  upload.single('image'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('status').optional().isIn(['planned', 'in_progress', 'completed', 'on_hold']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, budget, deadline, manager_id, status, priority, tags } = req.body;

    // Check if project exists
    const projectExists = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingProject = projectExists.rows[0];

    // Security check: Only admin or project manager can edit
    if (req.user.role !== 'admin' && 
        (req.user.role !== 'project_manager' || existingProject.manager_id !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You can only edit projects you manage.' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (budget) {
      updates.push(`budget = $${paramCount}`);
      values.push(parseFloat(budget));
      paramCount++;
    }
    if (deadline) {
      updates.push(`deadline = $${paramCount}`);
      values.push(deadline);
      paramCount++;
    }
    if (manager_id && req.user.role === 'admin') {
      updates.push(`manager_id = $${paramCount}`);
      values.push(parseInt(manager_id));
      paramCount++;
    }
    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (priority) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    if (tags) {
      const parsedTags = JSON.parse(tags || '[]');
      updates.push(`tags = $${paramCount}`);
      values.push(parsedTags);
      paramCount++;
    }

    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (existingProject.image_url) {
        const oldImagePath = path.join(__dirname, '..', existingProject.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updates.push(`image_url = $${paramCount}`);
      values.push(`/uploads/${req.file.filename}`);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    res.json({ message: 'Project updated successfully', project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project
router.delete('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager'])
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const projectExists = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectExists.rows[0];

    // Security check: Only admin or project manager can delete
    if (req.user.role !== 'admin' && 
        (req.user.role !== 'project_manager' || project.manager_id !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You can only delete projects you manage.' });
    }

    // Check if project has active tasks
    const activeTasks = await pool.query(
      "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status NOT IN ('completed', 'cancelled')",
      [id]
    );

    if (parseInt(activeTasks.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete project with active tasks. Please complete or cancel all tasks first.' 
      });
    }

    // Delete project image if exists
    if (project.image_url) {
      const imagePath = path.join(__dirname, '..', project.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete project (this will cascade delete related tasks due to foreign key constraints)
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;