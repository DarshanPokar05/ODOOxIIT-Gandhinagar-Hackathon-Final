const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Get all managers
router.get('/managers', authenticateToken, async (req, res) => {
  try {
    const managers = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE role IN ('admin', 'project_manager') AND status = 'active' ORDER BY first_name"
    );
    res.json(managers.rows);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active team members (used for assignee dropdowns)
router.get('/team-members', authenticateToken, async (req, res) => {
  try {
    const members = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE role = 'team_member' AND status = 'active' ORDER BY first_name"
    );
    res.json(members.rows);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with search
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT id, first_name, last_name, email, role, status, created_at
      FROM users
    `;
    let params = [];
    
    if (search) {
      query += ` WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const users = await pool.query(query, params);
    res.json(users.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  authorizeRole(['admin']),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['admin', 'project_manager', 'team_member', 'finance'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, is_verified, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, role, status',
      [email, hashedPassword, firstName, lastName, role, true, 'active']
    );

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin']),
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['admin', 'project_manager', 'team_member', 'finance']),
  body('status').optional().isIn(['active', 'inactive'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, firstName, lastName, role, status } = req.body;

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email) {
      const emailExists = await pool.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (firstName) {
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }
    if (lastName) {
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName);
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

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, first_name, last_name, role, status`;

    const result = await pool.query(query, values);
    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (soft delete by setting status to inactive)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete by setting status to inactive
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['inactive', id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query(
      'SELECT id, first_name, last_name, email, role, status, created_at FROM users WHERE id = $1',
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;