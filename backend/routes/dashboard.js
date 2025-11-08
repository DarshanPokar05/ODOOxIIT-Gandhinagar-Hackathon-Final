const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

// Admin Dashboard
router.get('/admin', authenticateToken, authorizeRole(['admin']), (req, res) => {
  res.json({
    message: 'Admin Dashboard',
    user: req.user,
    data: {
      totalUsers: 150,
      activeProjects: 25,
      systemHealth: 'Good',
      recentActivity: ['User John created', 'Project Alpha completed', 'System backup completed']
    }
  });
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