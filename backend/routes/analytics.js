const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Get analytics data
router.get('/', authenticateToken, authorizeRole(['admin', 'project_manager']), async (req, res) => {
  try {
    const { startDate, endDate, projectId, role } = req.query;
    
    let projectFilter = '';
    let roleFilter = '';
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    // Build filters based on user role and permissions
    if (req.user.role === 'project_manager') {
      // Project managers can only see their own projects
      projectFilter = ` AND p.manager_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }

    if (projectId && projectId !== 'all') {
      projectFilter += ` AND p.id = $${paramCount}`;
      params.push(projectId);
      paramCount++;
    }

    if (startDate && endDate) {
      dateFilter = ` AND p.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    }

    if (role && role !== 'all') {
      roleFilter = ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    // Get project financial data
    const projectsQuery = `
      SELECT 
        p.id,
        p.name,
        p.budget as revenue,
        COALESCE(p.budget * 0.6, 0) as cost,
        COALESCE(p.budget * 0.4, 0) as profit,
        CASE 
          WHEN p.status = 'completed' THEN 100
          WHEN p.status = 'in_progress' THEN 60
          WHEN p.status = 'planned' THEN 10
          ELSE 0
        END as progress,
        p.status,
        p.created_at,
        u.first_name || ' ' || u.last_name as manager_name,
        u.role as manager_role
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE 1=1 ${projectFilter} ${roleFilter} ${dateFilter}
      ORDER BY p.created_at DESC
    `;

    const projects = await pool.query(projectsQuery, params);

    // Get monthly revenue trend
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', p.created_at) as month,
        SUM(p.budget) as revenue,
        SUM(p.budget * 0.6) as cost,
        SUM(p.budget * 0.4) as profit
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE 1=1 ${projectFilter} ${roleFilter} ${dateFilter}
      GROUP BY DATE_TRUNC('month', p.created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    const monthlyData = await pool.query(monthlyQuery, params);

    // Calculate totals
    const totals = projects.rows.reduce((acc, project) => ({
      totalRevenue: acc.totalRevenue + (project.revenue || 0),
      totalCost: acc.totalCost + (project.cost || 0),
      totalProfit: acc.totalProfit + (project.profit || 0)
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0 });

    res.json({
      projects: projects.rows,
      monthlyTrend: monthlyData.rows,
      totals,
      summary: {
        totalProjects: projects.rows.length,
        avgProgress: projects.rows.length > 0 
          ? projects.rows.reduce((sum, p) => sum + p.progress, 0) / projects.rows.length 
          : 0
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects for dropdown
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT id, name FROM projects';
    const params = [];

    if (req.user.role === 'project_manager') {
      query += ' WHERE manager_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY name';

    const projects = await pool.query(query, params);
    res.json(projects.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;