const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Get all managers
router.get('/managers', authenticateToken, async (req, res) => {
  try {
    const managers = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE role IN ('admin', 'project_manager') ORDER BY first_name"
    );
    res.json(managers.rows);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;