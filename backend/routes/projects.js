const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
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

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name as manager_name,
             COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
    `);

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

module.exports = router;