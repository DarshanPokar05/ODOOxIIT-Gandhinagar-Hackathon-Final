const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// Admin Dashboard
router.get('/admin', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { pool } = require('../config/database');
    
    // Get KPI data
    const totalProjects = await pool.query("SELECT COUNT(*) FROM projects");
    const activeProjects = await pool.query("SELECT COUNT(*) FROM projects WHERE status = 'in_progress'");
    const hoursLogged = await pool.query("SELECT COALESCE(SUM(hours_logged), 0) FROM tasks");
    
    // Mock financial data (would come from invoices/bills tables in real app)
    const totalRevenue = 285000;
    const totalCost = 160000;
    const totalProfit = totalRevenue - totalCost;
    
    // Get projects with task counts
    const projects = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name as manager_name,
             COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, u.first_name, u.last_name
      ORDER BY p.created_at DESC
    `);
    
    res.json({
      message: 'Admin Dashboard',
      user: req.user,
      kpis: {
        totalProjects: parseInt(totalProjects.rows[0].count),
        activeProjects: parseInt(activeProjects.rows[0].count),
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        totalProfit: totalProfit
      },
      projects: projects.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Project Manager Dashboard
router.get('/project-manager', authenticateToken, authorizeRole(['project_manager', 'admin']), async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const userId = req.user.id;
    
    // Get PM's projects only
    const myProjects = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE manager_id = $1', [userId]
    );
    
    const activeTasks = await pool.query(`
      SELECT COUNT(*) FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE p.manager_id = $1 AND t.status != 'completed'
    `, [userId]);
    
    const pendingExpenses = await pool.query(`
      SELECT COUNT(*) FROM expenses e 
      JOIN projects p ON e.project_id = p.id 
      WHERE p.manager_id = $1 AND e.status = 'submitted'
    `, [userId]);
    
    const projects = await pool.query(`
      SELECT p.*, COUNT(t.id) as task_count,
             COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.manager_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [userId]);
    
    res.json({
      message: 'Project Manager Dashboard',
      user: req.user,
      kpis: {
        myProjects: parseInt(myProjects.rows[0].count),
        activeTasks: parseInt(activeTasks.rows[0].count),
        pendingExpenses: parseInt(pendingExpenses.rows[0].count)
      },
      projects: projects.rows
    });
  } catch (error) {
    console.error('PM dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Team Member Dashboard
router.get('/team-member', authenticateToken, authorizeRole(['team_member', 'project_manager', 'admin']), async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const userId = req.user.id;
    
    // Task statistics
    const myTasks = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1', [userId]
    );
    
    const completedTasks = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = \'completed\'', [userId]
    );
    
    const pendingTasks = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status IN (\'pending\', \'in_progress\', \'blocked\')', [userId]
    );
    
    const inProgressTasks = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = \'in_progress\'', [userId]
    );
    
    // Expense statistics
    const myExpenses = await pool.query(
      'SELECT COUNT(*) FROM expenses WHERE submitted_by = $1', [userId]
    );
    
    const totalExpenseAmount = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE submitted_by = $1 AND status = \'approved\'', [userId]
    );
    
    // Time logged
    const totalHoursLogged = await pool.query(
      'SELECT COALESCE(SUM(tl.hours), 0) as total FROM time_logs tl JOIN tasks t ON tl.task_id = t.id WHERE t.assigned_to = $1', [userId]
    );
    
    // Recent tasks with detailed info
    const recentTasks = await pool.query(`
      SELECT t.*, p.id as project_id, p.name as project_name, p.status as project_status,
             COALESCE(SUM(tl.hours), 0) as hours_logged
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN time_logs tl ON t.id = tl.task_id
      WHERE t.assigned_to = $1
      GROUP BY t.id, p.id, p.name, p.status
      ORDER BY t.updated_at DESC
      LIMIT 8
    `, [userId]);
    
    // Active projects
    const activeProjects = await pool.query(`
      SELECT DISTINCT p.*, COUNT(t.id) as my_task_count,
             COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_task_count
      FROM projects p
      JOIN tasks t ON p.id = t.project_id
      WHERE t.assigned_to = $1 AND p.status = 'in_progress'
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `, [userId]);
    
    // Recent expenses
    const recentExpenses = await pool.query(`
      SELECT e.*, p.name as project_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      WHERE e.submitted_by = $1
      ORDER BY e.created_at DESC
      LIMIT 5
    `, [userId]);
    
    // Upcoming deadlines
    const upcomingDeadlines = await pool.query(`
      SELECT t.*, p.id as project_id, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = $1 AND t.deadline IS NOT NULL 
        AND t.deadline >= CURRENT_DATE AND t.status != 'completed'
      ORDER BY t.deadline ASC
      LIMIT 5
    `, [userId]);
    
    res.json({
      message: 'Team Member Dashboard',
      user: req.user,
      kpis: {
        myTasks: parseInt(myTasks.rows[0].count),
        completedTasks: parseInt(completedTasks.rows[0].count),
        pendingTasks: parseInt(pendingTasks.rows[0].count),
        inProgressTasks: parseInt(inProgressTasks.rows[0].count),
        myExpenses: parseInt(myExpenses.rows[0].count),
        totalExpenseAmount: parseFloat(totalExpenseAmount.rows[0].total),
        totalHoursLogged: parseFloat(totalHoursLogged.rows[0].total)
      },
      recentTasks: recentTasks.rows,
      activeProjects: activeProjects.rows,
      recentExpenses: recentExpenses.rows,
      upcomingDeadlines: upcomingDeadlines.rows
    });
  } catch (error) {
    console.error('Team member dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Finance Manager Dashboard
router.get('/finance-manager', authenticateToken, authorizeRole(['finance_manager', 'admin']), async (req, res) => {
  try {
    const { pool } = require('../config/database');
    
    const pendingExpenses = await pool.query(
      'SELECT COUNT(*) FROM expenses WHERE status = \'approved\''
    );
    
    const totalExpenses = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = \'approved\''
    );
    
    const recentExpenses = await pool.query(`
      SELECT e.*, p.name as project_name, u.first_name || ' ' || u.last_name as submitted_by_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN users u ON e.submitted_by = u.id
      WHERE e.status IN ('approved', 'submitted')
      ORDER BY e.created_at DESC
      LIMIT 10
    `);
    
    res.json({
      message: 'Finance Manager Dashboard',
      user: req.user,
      kpis: {
        pendingExpenses: parseInt(pendingExpenses.rows[0].count),
        totalExpenses: parseFloat(totalExpenses.rows[0].total)
      },
      recentExpenses: recentExpenses.rows
    });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;