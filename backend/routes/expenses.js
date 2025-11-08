const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Generate Expense number
const generateExpenseNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `EXP-${year}${month}-`;
  
  const result = await pool.query(
    'SELECT expense_number FROM expenses WHERE expense_number LIKE $1 ORDER BY expense_number DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].expense_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Log expense history
const logExpenseHistory = async (expenseId, action, userId, beforeData, afterData) => {
  await pool.query(`
    INSERT INTO expense_history (expense_id, action, user_id, before_data, after_data)
    VALUES ($1, $2, $3, $4, $5)
  `, [expenseId, action, userId, beforeData ? JSON.stringify(beforeData) : null, JSON.stringify(afterData)]);
};

// Get all expenses
router.get('/', auth, async (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = `
      SELECT e.*, p.name as project_name, t.title as task_name,
             u.first_name || ' ' || u.last_name as submitted_by_name,
             a.first_name || ' ' || a.last_name as approver_name,
             c.name as customer_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      LEFT JOIN tasks t ON e.task_id = t.id
      JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users a ON e.approver_id = a.id
      LEFT JOIN customers c ON e.billable_to_customer_id = c.id
    `;
    
    const params = [];
    const conditions = [];
    
    // Role-based filtering
    if (req.user.role === 'team_member') {
      conditions.push(`e.submitted_by = $${params.length + 1}`);
      params.push(req.user.id);
    }
    
    if (project_id) {
      conditions.push(`e.project_id = $${params.length + 1}`);
      params.push(project_id);
    }
    
    if (status) {
      conditions.push(`e.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single expense
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, p.name as project_name, t.title as task_name,
             u.first_name || ' ' || u.last_name as submitted_by_name,
             a.first_name || ' ' || a.last_name as approver_name,
             c.name as customer_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      LEFT JOIN tasks t ON e.task_id = t.id
      JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users a ON e.approver_id = a.id
      LEFT JOIN customers c ON e.billable_to_customer_id = c.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Check permissions
    const expense = result.rows[0];
    if (req.user.role === 'team_member' && expense.submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create expense
router.post('/', auth, async (req, res) => {
  try {
    const { 
      project_id, task_id, expense_date, category, description, 
      amount, currency, exchange_rate, billable, billable_to_customer_id 
    } = req.body;
    
    // Validation
    if (!project_id || !category || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Project, category, and valid amount are required' });
    }
    
    if (billable && !billable_to_customer_id) {
      return res.status(400).json({ message: 'Customer is required for billable expenses' });
    }
    
    const expense_number = await generateExpenseNumber();
    const amount_company_currency = amount * (exchange_rate || 1.0);
    
    const result = await pool.query(`
      INSERT INTO expenses (
        expense_number, project_id, task_id, submitted_by, expense_date, 
        category, description, amount, currency, exchange_rate, 
        amount_company_currency, billable, billable_to_customer_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      expense_number, project_id, task_id, req.user.id, expense_date || new Date().toISOString().split('T')[0],
      category, description, amount, currency || 'USD', exchange_rate || 1.0,
      amount_company_currency, billable || false, billable_to_customer_id
    ]);
    
    // Log history
    await logExpenseHistory(result.rows[0].id, 'CREATED', req.user.id, null, result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update expense (only draft or submitted)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      project_id, task_id, expense_date, category, description, 
      amount, currency, exchange_rate, billable, billable_to_customer_id 
    } = req.body;
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    // Check permissions
    if (req.user.role === 'team_member' && expense.submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (!['draft', 'submitted'].includes(expense.status)) {
      return res.status(400).json({ message: 'Cannot update expense in current status' });
    }
    
    const amount_company_currency = amount * (exchange_rate || 1.0);
    
    const result = await pool.query(`
      UPDATE expenses 
      SET project_id = $1, task_id = $2, expense_date = $3, category = $4, 
          description = $5, amount = $6, currency = $7, exchange_rate = $8,
          amount_company_currency = $9, billable = $10, billable_to_customer_id = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      project_id, task_id, expense_date, category, description, 
      amount, currency, exchange_rate, amount_company_currency, 
      billable, billable_to_customer_id, id
    ]);
    
    // Log history
    await logExpenseHistory(id, 'UPDATED', req.user.id, expense, result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit expense for approval
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    // Check permissions
    if (expense.submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Can only submit draft expenses' });
    }
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    // Log history
    await logExpenseHistory(id, 'SUBMITTED', req.user.id, expense, result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve expense
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (!['admin', 'project_manager', 'finance_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Can only approve submitted expenses' });
    }
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'approved', approver_id = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Update project cost
    await pool.query(`
      UPDATE projects 
      SET cost = COALESCE(cost, 0) + $1
      WHERE id = $2
    `, [expense.amount_company_currency, expense.project_id]);
    
    // Log history
    await logExpenseHistory(id, 'APPROVED', req.user.id, expense, result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject expense
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    
    // Check permissions
    if (!['admin', 'project_manager', 'finance_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Can only reject submitted expenses' });
    }
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'rejected', approver_id = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [req.user.id, rejection_reason, id]);
    
    // Log history
    await logExpenseHistory(id, 'REJECTED', req.user.id, expense, result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark expense as reimbursed
router.post('/:id/reimburse', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (!['admin', 'finance_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    if (expense.status !== 'approved') {
      return res.status(400).json({ message: 'Can only reimburse approved expenses' });
    }
    
    const result = await pool.query(`
      UPDATE expenses 
      SET status = 'reimbursed', reimbursed_by = $1, reimbursed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Log history
    await logExpenseHistory(id, 'REIMBURSED', req.user.id, expense, result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking expense as reimbursed:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload receipt
router.post('/:id/attach', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const existingExpense = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    // Check permissions
    if (req.user.role === 'team_member' && expense.submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const receipt_url = `/uploads/receipts/${req.file.filename}`;
    
    const result = await pool.query(`
      UPDATE expenses 
      SET receipt_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [receipt_url, id]);
    
    // Log history
    await logExpenseHistory(id, 'RECEIPT_ATTACHED', req.user.id, expense, result.rows[0]);
    
    res.json({ message: 'Receipt uploaded successfully', receipt_url });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expense categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = ['Travel', 'Software', 'Hardware', 'Meals', 'Other'];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;