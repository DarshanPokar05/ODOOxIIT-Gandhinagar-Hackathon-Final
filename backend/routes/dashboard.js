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
router.get('/project-manager', authenticateToken, authorizeRole(['project_manager', 'admin']), (req, res) => {
  res.json({
    message: 'Project Manager Dashboard',
    user: req.user,
    data: {
      myProjects: 8,
      teamMembers: 12,
      pendingTasks: 23,
      completedTasks: 45,
      projects: ['Project Alpha', 'Project Beta', 'Project Gamma']
    }
  });
});

// Team Member Dashboard
router.get('/team-member', authenticateToken, authorizeRole(['team_member', 'project_manager', 'admin']), (req, res) => {
  res.json({
    message: 'Team Member Dashboard',
    user: req.user,
    data: {
      assignedTasks: 5,
      completedTasks: 12,
      pendingTasks: 3,
      currentProject: 'Project Alpha',
      recentTasks: ['Task 1: UI Design', 'Task 2: API Integration', 'Task 3: Testing']
    }
  });
});

module.exports = router;