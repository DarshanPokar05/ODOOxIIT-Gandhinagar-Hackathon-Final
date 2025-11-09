const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Get tasks based on role and permissions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT t.id, t.title as name, t.description, t.status, t.assigned_to, t.project_id,
             p.name as project_name, p.manager_id,
             u.first_name || ' ' || u.last_name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    // Role-based filtering
    if (req.user.role === 'project_manager') {
      conditions.push('p.manager_id = $' + (params.length + 1));
      params.push(req.user.id);
    } else if (req.user.role === 'team_member') {
      conditions.push('t.assigned_to = $' + (params.length + 1));
      params.push(req.user.id);
    }
    
    if (project_id) {
      conditions.push('t.project_id = $' + (params.length + 1));
      params.push(project_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.title';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks for a project with full details
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { search, assignee, priority, status } = req.query;

    let query = `
      SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as assignee_name,
        u.email as assignee_email,
        COUNT(DISTINCT st.id) as subtask_count,
        COUNT(DISTINCT st.id) FILTER (WHERE st.is_completed = true) as completed_subtasks,
        COUNT(DISTINCT tc.id) as comment_count,
        COALESCE(SUM(tl.hours), 0) as total_hours
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN subtasks st ON t.id = st.task_id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      LEFT JOIN time_logs tl ON t.id = tl.task_id
      WHERE t.project_id = $1
    `;
    
    const params = [projectId];
    let paramCount = 2;

    if (search) {
      query += ` AND (t.title ILIKE $${paramCount} OR t.task_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (assignee) {
      query += ` AND t.assigned_to = $${paramCount}`;
      params.push(assignee);
      paramCount++;
    }

    if (priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` GROUP BY t.id, u.first_name, u.last_name, u.email ORDER BY t.created_at DESC`;

    const tasks = await pool.query(query, params);
    res.json(tasks.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status (for drag & drop)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query('UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    
    // Log activity
    await pool.query(
      'INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Status Changed', `Status changed to ${status}`]
    );

    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task details with all related data
// Get tasks for invoicing
router.get('/for-invoice', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'completed'
      ORDER BY t.title
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks for invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task details with all related data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get task details
    const task = await pool.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name as assignee_name, u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1
    `, [id]);

    if (task.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get subtasks
    const subtasks = await pool.query('SELECT * FROM subtasks WHERE task_id = $1 ORDER BY created_at', [id]);

    // Get comments
    const comments = await pool.query(`
      SELECT tc.*, u.first_name || ' ' || u.last_name as user_name
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at DESC
    `, [id]);

    // Get attachments
    const attachments = await pool.query(`
      SELECT ta.*, u.first_name || ' ' || u.last_name as uploaded_by
      FROM task_attachments ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.created_at DESC
    `, [id]);

    // Get time logs
    const timeLogs = await pool.query(`
      SELECT tl.*, u.first_name || ' ' || u.last_name as user_name
      FROM time_logs tl
      JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = $1
      ORDER BY tl.date DESC
    `, [id]);

    // Get activity logs
    const activityLogs = await pool.query(`
      SELECT tal.*, u.first_name || ' ' || u.last_name as user_name
      FROM task_activity_logs tal
      JOIN users u ON tal.user_id = u.id
      WHERE tal.task_id = $1
      ORDER BY tal.created_at DESC
    `, [id]);

    res.json({
      task: task.rows[0],
      subtasks: subtasks.rows,
      comments: comments.rows,
      attachments: attachments.rows,
      timeLogs: timeLogs.rows,
      activityLogs: activityLogs.rows
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager']),
  body('title').trim().isLength({ min: 1 }),
  body('project_id').isInt(),
  body('priority').isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['pending', 'in_progress', 'blocked', 'completed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, project_id, assigned_to, priority, deadline, estimated_hours, role, status = 'pending' } = req.body;

    // Generate task ID
    const taskCount = await pool.query('SELECT COUNT(*) FROM tasks');
    const taskId = `TASK-${String(parseInt(taskCount.rows[0].count) + 1).padStart(5, '0')}`;

    const result = await pool.query(`
      INSERT INTO tasks (title, description, project_id, assigned_to, priority, deadline, estimated_hours, role, task_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, description, project_id, assigned_to, priority, deadline, estimated_hours, role, taskId, status]);

    // Log activity
    await pool.query(
      'INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, req.user.id, 'Task Created', `Task "${title}" created`]
    );

    res.status(201).json({ message: 'Task created successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to task
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const result = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, comment]
    );

    // Log activity
    await pool.query(
      'INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Comment Added', 'New comment added']
    );

    res.status(201).json({ message: 'Comment added successfully', comment: result.rows[0] });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add time log
router.post('/:id/time-logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, date, note } = req.body;

    const result = await pool.query(
      'INSERT INTO time_logs (task_id, user_id, hours, date, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, req.user.id, hours, date, note]
    );

    // Update task hours_logged
    await pool.query(
      'UPDATE tasks SET hours_logged = (SELECT COALESCE(SUM(hours), 0) FROM time_logs WHERE task_id = $1) WHERE id = $1',
      [id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Time Logged', `${hours} hours logged`]
    );

    res.status(201).json({ message: 'Time log added successfully', timeLog: result.rows[0] });
  } catch (error) {
    console.error('Error adding time log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager']),
  body('title').optional().trim().isLength({ min: 1 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['pending', 'in_progress', 'blocked', 'completed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, assigned_to, priority, deadline, estimated_hours, role, status } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (assigned_to) {
      updates.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }
    if (priority) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    if (deadline) {
      updates.push(`deadline = $${paramCount}`);
      values.push(deadline);
      paramCount++;
    }
    if (estimated_hours) {
      updates.push(`estimated_hours = $${paramCount}`);
      values.push(estimated_hours);
      paramCount++;
    }
    if (role) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }
    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    // Log activity
    await pool.query(
      'INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'Task Updated', 'Task details updated']
    );

    res.json({ message: 'Task updated successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks for invoicing
router.get('/for-invoice', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'completed'
      ORDER BY t.title
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks for invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;