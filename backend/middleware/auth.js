const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

const canAccessProject = async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.user;
  
  if (role === 'admin') return next();
  
  if (role === 'project_manager') {
    const result = await pool.query('SELECT manager_id FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0 || result.rows[0].manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }
  }
  
  next();
};

module.exports = { authenticateToken, authorizeRole, canAccessProject };