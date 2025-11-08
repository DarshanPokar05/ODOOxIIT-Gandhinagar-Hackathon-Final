const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const salesAuth = require('../middleware/salesAuth');
const { pool } = require('../config/database');
const router = express.Router();

// Generate order number
const generateOrderNumber = async (client) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `SO-${year}${month}-`;
  
  const result = await client.query(
    'SELECT COUNT(*) FROM sales_orders WHERE order_number LIKE $1',
    [`${prefix}%`]
  );
  
  const count = parseInt(result.rows[0].count) + 1;
  return `${prefix}${String(count).padStart(3, '0')}`;
};

// Audit log function
const logAudit = async (tableName, recordId, action, userId, beforeData = null, afterData = null) => {
  try {
    // The audit_logs table in this DB uses columns: action, entity, entity_id, user_id, before_values, after_values
    await pool.query(
      'INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [action, tableName, recordId, userId, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null]
    );
  } catch (auditError) {
    console.error('Audit log error:', auditError);
    // Don't fail the main operation if audit logging fails
  }
};

// GET /api/sales-orders/data/customers - Get customers
router.get('/data/customers', authenticateToken, salesAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales-orders/data/projects - Get projects
router.get('/data/projects', authenticateToken, salesAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, status FROM projects ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales-orders/data/products - Get products for sales
router.get('/data/products', authenticateToken, salesAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, sales_price, sales_tax_percent 
      FROM products 
      WHERE type_sales = true 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales-orders - List sales orders
router.get('/', authenticateToken, salesAuth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT so.*, c.name as customer_name, p.name as project_name,
             u1.first_name || ' ' || u1.last_name as created_by_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN projects p ON so.project_id = p.id
      LEFT JOIN users u1 ON so.created_by = u1.id
    `;
    
    const params = [];
    if (project_id) {
      query += ' WHERE so.project_id = $1';
      params.push(project_id);
    }
    
    query += ' ORDER BY so.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales-orders/:id - Get single sales order
router.get('/:id', authenticateToken, salesAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const orderResult = await pool.query(`
      SELECT so.*, c.name as customer_name, p.name as project_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN projects p ON so.project_id = p.id
      WHERE so.id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    const linesResult = await pool.query(`
      SELECT sol.*, pr.name as product_name
      FROM sales_order_lines sol
      LEFT JOIN products pr ON sol.product_id = pr.id
      WHERE sol.sales_order_id = $1
      ORDER BY sol.id
    `, [id]);
    
    const order = orderResult.rows[0];
    order.lines = linesResult.rows;
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sales-orders - Create sales order
router.post('/', authenticateToken, salesAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Sales order creation request:', {
      body: req.body,
      user: req.user
    });
    
    const { customer_id, project_id, order_date, notes, lines } = req.body;
    
    // Validation
    if (!customer_id || !project_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Customer, project, and at least one line item required' });
    }
    
    // Verify customer exists
    const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Customer not found' });
    }
    
    // Verify project exists
    const projectCheck = await client.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Project not found' });
    }
    
    // Validate lines
    for (const line of lines) {
      if (!line.product_id || !line.unit || line.quantity <= 0 || line.unit_price <= 0 || line.tax_percent < 0) {
        return res.status(400).json({ message: 'Invalid line item data. All fields are required and values must be positive.' });
      }
      
      // Verify product exists and is for sales
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1 AND type_sales = true',
        [line.product_id]
      );
      
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ message: `Product ${line.product_id} not found or not available for sales` });
      }
    }
    
    const orderNumber = await generateOrderNumber(client);
    
    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    
    const processedLines = lines.map(line => {
      const lineTotal = line.quantity * line.unit_price;
      const taxAmount = lineTotal * (line.tax_percent / 100);
      const lineGrandTotal = lineTotal + taxAmount;
      
      subtotal += lineTotal;
      totalTax += taxAmount;
      
      return {
        ...line,
        line_total: lineTotal,
        tax_amount: taxAmount,
        line_grand_total: lineGrandTotal
      };
    });
    
    const grandTotal = subtotal + totalTax;
    
    // Insert sales order
    const orderResult = await client.query(`
      INSERT INTO sales_orders (order_number, customer_id, project_id, order_date, notes, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [orderNumber, customer_id, project_id, order_date, notes, subtotal, totalTax, grandTotal, req.user.id, req.user.id]);
    
    const salesOrderId = orderResult.rows[0].id;
    
    // Insert order lines
    for (const line of processedLines) {
      await client.query(`
        INSERT INTO sales_order_lines (sales_order_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [salesOrderId, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent, line.line_total, line.tax_amount, line.line_grand_total]);
    }
    
    await logAudit('sales_orders', salesOrderId, 'CREATE', req.user.id, null, orderResult.rows[0]);
    
    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sales order:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/sales-orders/:id - Update sales order (draft only)
router.put('/:id', authenticateToken, salesAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { customer_id, project_id, order_date, notes, lines } = req.body;
    
    // Check if order exists and is draft
    const existingOrder = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    if (existingOrder.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Cannot edit confirmed sales order' });
    }
    
    // Calculate new totals
    let subtotal = 0;
    let totalTax = 0;
    
    const processedLines = lines.map(line => {
      const lineTotal = line.quantity * line.unit_price;
      const taxAmount = lineTotal * (line.tax_percent / 100);
      const lineGrandTotal = lineTotal + taxAmount;
      
      subtotal += lineTotal;
      totalTax += taxAmount;
      
      return {
        ...line,
        line_total: lineTotal,
        tax_amount: taxAmount,
        line_grand_total: lineGrandTotal
      };
    });
    
    const grandTotal = subtotal + totalTax;
    
    // Update sales order
    const orderResult = await client.query(`
      UPDATE sales_orders 
      SET customer_id = $1, project_id = $2, order_date = $3, notes = $4, subtotal = $5, total_tax = $6, grand_total = $7, updated_by = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [customer_id, project_id, order_date, notes, subtotal, totalTax, grandTotal, req.user.id, id]);
    
    // Delete existing lines
    await client.query('DELETE FROM sales_order_lines WHERE sales_order_id = $1', [id]);
    
    // Insert new lines
    for (const line of processedLines) {
      await client.query(`
        INSERT INTO sales_order_lines (sales_order_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent, line.line_total, line.tax_amount, line.line_grand_total]);
    }
    
    await logAudit('sales_orders', id, 'UPDATE', req.user.id, existingOrder.rows[0], orderResult.rows[0]);
    
    await client.query('COMMIT');
    res.json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating sales order:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /api/sales-orders/confirm/:id - Confirm sales order
router.post('/confirm/:id', authenticateToken, salesAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingOrder = await pool.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    if (existingOrder.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Sales order already confirmed' });
    }
    
    const result = await pool.query(`
      UPDATE sales_orders 
      SET status = 'confirmed', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    await logAudit('sales_orders', id, 'CONFIRM', req.user.id, existingOrder.rows[0], result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirming sales order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;