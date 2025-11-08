const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateExpenseNumber } = require('../setup-expenses-complete');

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Security helper functions
const hasPermission = (user, action, expense = null) => {
  const role = user.role;
  
  switch (action) {
    case 'create':
      return ['team_member', 'project_manager', 'admin'].includes(role);
    case 'view_own':
      return ['team_member', 'project_manager', 'admin'].includes(role);
    case 'view_project':
      return ['project_manager', 'admin'].includes(role);
    case 'view_all':
      return ['admin'].includes(role);
    case 'approve':
      return ['project_manager', 'admin'].includes(role);
    case 'reimburse':
      return ['admin'].includes(role);
    case 'edit_draft':
      return expense && expense.status === 'draft' && 
             (expense.submitted_by === user.id || ['project_manager', 'admin'].includes(role));
    default:
      return false;
  }
};

const logExpenseHistory = async (client, expenseId, action, oldStatus, newStatus, userId, reason = null, beforeSnapshot = null, afterSnapshot = null) => {
  try {
    await client.query(`
      INSERT INTO expense_history (expense_id, action, old_status, new_status, changed_by, change_reason, before_snapshot, after_snapshot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [expenseId, action, oldStatus, newStatus, userId, reason, beforeSnapshot, afterSnapshot]);
  } catch (error) {
    console.error('Error logging expense history:', error);
  }
};

// GET /expenses - List expenses with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { project_id, status, billable, submitted_by, start_date, end_date } = req.query;
    
    let query = `
      SELECT e.*, 
             p.name as project_name,
             t.name as task_name,
             u.first_name || ' ' || u.last_name as submitted_by_name,
             c.name as customer_name,
             a.first_name || ' ' || a.last_name as approver_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      LEFT JOIN tasks t ON e.task_id = t.id
      JOIN users u ON e.submitted_by = u.id
      LEFT JOIN customers c ON e.billable_to_customer_id = c.id
      LEFT JOIN users a ON e.approver_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Apply security filters
    if (!hasPermission(req.user, 'view_all')) {
      if (hasPermission(req.user, 'view_project')) {
        // Project managers can see project expenses
        query += ` AND (e.submitted_by = $${++paramCount} OR p.manager_id = $${paramCount})`;
        params.push(req.user.id);
      } else {
        // Team members can only see their own
        query += ` AND e.submitted_by = $${++paramCount}`;
        params.push(req.user.id);
      }
    }
    
    // Apply filters
    if (project_id) {
      query += ` AND e.project_id = $${++paramCount}`;
      params.push(project_id);
    }
    
    if (status) {
      query += ` AND e.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (billable !== undefined) {
      query += ` AND e.billable = $${++paramCount}`;
      params.push(billable === 'true');
    }
    
    if (submitted_by) {
      query += ` AND e.submitted_by = $${++paramCount}`;
      params.push(submitted_by);
    }
    
    if (start_date) {
      query += ` AND e.expense_date >= $${++paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND e.expense_date <= $${++paramCount}`;
      params.push(end_date);
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /expenses/:id - Get single expense
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, 
             p.name as project_name,
             t.name as task_name,
             u.first_name || ' ' || u.last_name as submitted_by_name,
             c.name as customer_name,
             a.first_name || ' ' || a.last_name as approver_name,
             r.first_name || ' ' || r.last_name as reimbursed_by_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      LEFT JOIN tasks t ON e.task_id = t.id
      JOIN users u ON e.submitted_by = u.id
      LEFT JOIN customers c ON e.billable_to_customer_id = c.id
      LEFT JOIN users a ON e.approver_id = a.id
      LEFT JOIN users r ON e.reimbursed_by = r.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    const expense = result.rows[0];
    
    // Security check
    if (!hasPermission(req.user, 'view_all') && 
        !hasPermission(req.user, 'view_project') && 
        expense.submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /expenses - Create expense
router.post('/', auth, upload.single('receipt'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!hasPermission(req.user, 'create')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await client.query('BEGIN');

    const {
      project_id, task_id, expense_date, category, description,
      amount, currency = 'USD', exchange_rate = 1.0, billable = false,
      billable_to_customer_id
    } = req.body;

    // Validation
    if (!project_id || !expense_date || !category || !description || !amount) {
      return res.status(400).json({ message: 'Project, date, category, description, and amount are required' });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    if (billable === 'true' && !billable_to_customer_id) {
      return res.status(400).json({ message: 'Customer is required for billable expenses' });
    }

    // Verify project access
    const projectCheck = await client.query(`
      SELECT id FROM projects 
      WHERE id = $1 AND (
        $2 = ANY(team_members) OR 
        manager_id = $2 OR 
        $3 = 'admin'
      )
    `, [project_id, req.user.id, req.user.role]);

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Generate expense number
    const expense_number = await generateExpenseNumber(client);

    // Handle receipt upload
    let receipt_url = null;
    if (req.file) {
      receipt_url = `/uploads/receipts/${req.file.filename}`;
    }

    // Insert expense
    const result = await client.query(`
      INSERT INTO expenses (
        expense_number, project_id, task_id, submitted_by, expense_date,
        category, description, amount, currency, exchange_rate,
        billable, billable_to_customer_id, receipt_url, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      expense_number, project_id, task_id || null, req.user.id, expense_date,
      category, description, amount, currency, exchange_rate,
      billable === 'true', billable_to_customer_id || null, receipt_url,
      req.user.id, req.user.id
    ]);

    const expense = result.rows[0];

    // Log history
    await logExpenseHistory(client, expense.id, 'CREATE', null, 'draft', req.user.id, null, null, JSON.stringify(expense));

    await client.query('COMMIT');
    res.status(201).json(expense);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /expenses/:id - Update expense
router.put('/:id', auth, upload.single('receipt'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    
    // Get existing expense
    const existingResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const existingExpense = existingResult.rows[0];

    // Security check
    if (!hasPermission(req.user, 'edit_draft', existingExpense)) {
      return res.status(403).json({ message: 'Cannot edit this expense' });
    }

    const {
      project_id, task_id, expense_date, category, description,
      amount, currency, exchange_rate, billable, billable_to_customer_id
    } = req.body;

    // Validation
    if (billable === 'true' && !billable_to_customer_id) {
      return res.status(400).json({ message: 'Customer is required for billable expenses' });
    }

    // Handle receipt upload
    let receipt_url = existingExpense.receipt_url;
    if (req.file) {
      receipt_url = `/uploads/receipts/${req.file.filename}`;
      // Delete old receipt file if exists
      if (existingExpense.receipt_url) {
        const oldFilePath = path.join(__dirname, '..', existingExpense.receipt_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Update expense
    const result = await client.query(`
      UPDATE expenses SET
        project_id = COALESCE($1, project_id),
        task_id = $2,
        expense_date = COALESCE($3, expense_date),
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        amount = COALESCE($6, amount),
        currency = COALESCE($7, currency),
        exchange_rate = COALESCE($8, exchange_rate),
        billable = COALESCE($9, billable),
        billable_to_customer_id = $10,
        receipt_url = COALESCE($11, receipt_url),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      project_id, task_id || null, expense_date, category, description,
      amount, currency, exchange_rate, billable === 'true' ? true : billable === 'false' ? false : null,
      billable_to_customer_id || null, receipt_url, req.user.id, id
    ]);

    // Log history
    await logExpenseHistory(client, id, 'UPDATE', existingExpense.status, result.rows[0].status, req.user.id, null, JSON.stringify(existingExpense), JSON.stringify(result.rows[0]));

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /expenses/:id/submit - Submit expense for approval
router.post('/:id/submit', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    
    const existingResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = existingResult.rows[0];

    // Security check
    if (expense.submitted_by !== req.user.id && !['project_manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be submitted' });
    }

    // Check receipt requirement
    if (expense.receipt_required && !expense.receipt_url) {
      return res.status(400).json({ message: 'Receipt is required for this expense amount' });
    }

    // Update status
    const result = await client.query(`
      UPDATE expenses SET
        status = 'submitted',
        submitted_at = CURRENT_TIMESTAMP,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);

    // Log history
    await logExpenseHistory(client, id, 'SUBMIT', 'draft', 'submitted', req.user.id);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting expense:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /expenses/:id/approve - Approve expense
router.post('/:id/approve', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!hasPermission(req.user, 'approve')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;
    
    const existingResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = existingResult.rows[0];

    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted expenses can be approved' });
    }

    // Update status and project cost
    const result = await client.query(`
      UPDATE expenses SET
        status = 'approved',
        approver_id = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);

    // Update project cost
    await client.query(`
      UPDATE projects SET
        cost = COALESCE(cost, 0) + $1,
        profit = COALESCE(revenue, 0) - (COALESCE(cost, 0) + $1)
      WHERE id = $2
    `, [expense.amount_company_currency, expense.project_id]);

    // Log history
    await logExpenseHistory(client, id, 'APPROVE', 'submitted', 'approved', req.user.id);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving expense:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /expenses/:id/reject - Reject expense
router.post('/:id/reject', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!hasPermission(req.user, 'approve')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const existingResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = existingResult.rows[0];

    if (expense.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted expenses can be rejected' });
    }

    // Update status
    const result = await client.query(`
      UPDATE expenses SET
        status = 'rejected',
        approver_id = $1,
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = $2,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [req.user.id, reason, id]);

    // Log history
    await logExpenseHistory(client, id, 'REJECT', 'submitted', 'rejected', req.user.id, reason);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting expense:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /expenses/:id/reimburse - Mark expense as reimbursed
router.post('/:id/reimburse', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    if (!hasPermission(req.user, 'reimburse')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;
    
    const existingResult = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = existingResult.rows[0];

    if (expense.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved expenses can be reimbursed' });
    }

    // Update status
    const result = await client.query(`
      UPDATE expenses SET
        status = 'reimbursed',
        reimbursed_by = $1,
        reimbursed_at = CURRENT_TIMESTAMP,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);

    // Log history
    await logExpenseHistory(client, id, 'REIMBURSE', 'approved', 'reimbursed', req.user.id);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reimbursing expense:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /expenses/:id/history - Get expense history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can view this expense
    const expenseCheck = await pool.query('SELECT submitted_by FROM expenses WHERE id = $1', [id]);
    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (!hasPermission(req.user, 'view_all') && 
        expenseCheck.rows[0].submitted_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT eh.*, u.first_name || ' ' || u.last_name as changed_by_name
      FROM expense_history eh
      JOIN users u ON eh.changed_by = u.id
      WHERE eh.expense_id = $1
      ORDER BY eh.changed_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /customers - Get customers for billable expenses
router.get('/customers/list', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM customers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;