const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();

// Generate Invoice number
const generateInvoiceNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;
  
  const result = await pool.query(
    'SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT i.*, c.name as customer_name, p.name as project_name, 
             u.first_name || ' ' || u.last_name as created_by_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN projects p ON i.project_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
    `;
    
    const params = [];
    if (project_id) {
      query += ' WHERE i.project_id = $1';
      params.push(project_id);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single invoice with lines
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, p.name as project_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN projects p ON i.project_id = p.id
      WHERE i.id = $1
    `, [id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    const linesResult = await pool.query(`
      SELECT il.*, t.title as task_name, t.description as task_description
      FROM invoice_lines il
      JOIN tasks t ON il.task_id = t.id
      WHERE il.invoice_id = $1
      ORDER BY il.id
    `, [id]);
    
    const invoice = {
      ...invoiceResult.rows[0],
      lines: linesResult.rows
    };
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create invoice
router.post('/', auth, async (req, res) => {
  try {
    const { customer_id, project_id, sales_order_id, invoice_date, due_date, notes, lines } = req.body;
    
    // Validation
    if (!customer_id || !project_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Customer, project, and at least one line item are required' });
    }
    
    const invoice_number = await generateInvoiceNumber();
    
    // Calculate totals
    let subtotal = 0;
    let total_tax = 0;
    
    lines.forEach(line => {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      subtotal += line_total;
      total_tax += tax_amount;
    });
    
    const grand_total = subtotal + total_tax;
    
    // Insert invoice
    const invoiceResult = await pool.query(`
      INSERT INTO invoices (invoice_number, customer_id, project_id, sales_order_id, invoice_date, due_date, notes, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [invoice_number, customer_id, project_id, sales_order_id, invoice_date || new Date().toISOString().split('T')[0], due_date, notes || '', subtotal, total_tax, grand_total, req.user.id, req.user.id]);
    
    const invoiceId = invoiceResult.rows[0].id;
    
    // Insert lines
    for (const line of lines) {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;
      
      await pool.query(`
        INSERT INTO invoice_lines (invoice_id, task_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [invoiceId, line.task_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line_total, tax_amount, line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, after_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['CREATE', 'invoice', invoiceId, req.user.id, JSON.stringify(invoiceResult.rows[0])]);
    
    res.status(201).json(invoiceResult.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update invoice (only in draft status)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, project_id, invoice_date, due_date, notes, lines } = req.body;
    
    const existingInvoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    if (existingInvoice.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Cannot update posted invoice' });
    }
    
    // Calculate totals
    let subtotal = 0;
    let total_tax = 0;
    
    lines.forEach(line => {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      subtotal += line_total;
      total_tax += tax_amount;
    });
    
    const grand_total = subtotal + total_tax;
    
    // Update invoice
    const invoiceResult = await pool.query(`
      UPDATE invoices 
      SET customer_id = $1, project_id = $2, invoice_date = $3, due_date = $4, notes = $5, subtotal = $6, total_tax = $7, grand_total = $8, updated_by = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [customer_id, project_id, invoice_date, due_date, notes, subtotal, total_tax, grand_total, req.user.id, id]);
    
    // Delete existing lines and insert new ones
    await pool.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [id]);
    
    for (const line of lines) {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;
      
      await pool.query(`
        INSERT INTO invoice_lines (invoice_id, task_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, line.task_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line_total, tax_amount, line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['UPDATE', 'invoice', id, req.user.id, JSON.stringify(existingInvoice.rows[0]), JSON.stringify(invoiceResult.rows[0])]);
    
    res.json(invoiceResult.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Post invoice
router.post('/post/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingInvoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    if (existingInvoice.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Invoice is already posted' });
    }
    
    const result = await pool.query(`
      UPDATE invoices 
      SET status = 'posted', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['POST', 'invoice', id, req.user.id, JSON.stringify(existingInvoice.rows[0]), JSON.stringify(result.rows[0])]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error posting invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark invoice as paid
router.post('/mark-paid/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingInvoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    if (existingInvoice.rows[0].status !== 'posted') {
      return res.status(400).json({ message: 'Invoice must be posted before marking as paid' });
    }
    
    const result = await pool.query(`
      UPDATE invoices 
      SET status = 'paid', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Update project revenue
    await pool.query(`
      UPDATE projects 
      SET revenue = COALESCE(revenue, 0) + $1
      WHERE id = $2
    `, [existingInvoice.rows[0].grand_total, existingInvoice.rows[0].project_id]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['MARK_PAID', 'invoice', id, req.user.id, JSON.stringify(existingInvoice.rows[0]), JSON.stringify(result.rows[0])]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create invoice from sales order
router.post('/from-sales-order/:so_id', auth, async (req, res) => {
  try {
    const { so_id } = req.params;
    
    // Get sales order with lines
    const soResult = await pool.query(`
      SELECT so.*, c.name as customer_name, p.name as project_name
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      JOIN projects p ON so.project_id = p.id
      WHERE so.id = $1 AND so.status = 'confirmed'
    `, [so_id]);
    
    if (soResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sales order not found or not confirmed' });
    }
    
    const salesOrder = soResult.rows[0];
    
    const linesResult = await pool.query(`
      SELECT sol.*, pr.name as product_name
      FROM sales_order_lines sol
      JOIN products pr ON sol.product_id = pr.id
      WHERE sol.sales_order_id = $1
    `, [so_id]);
    
    const invoice_number = await generateInvoiceNumber();
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30); // 30 days from today
    
    // Create invoice
    const invoiceResult = await pool.query(`
      INSERT INTO invoices (invoice_number, customer_id, project_id, sales_order_id, due_date, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [invoice_number, salesOrder.customer_id, salesOrder.project_id, so_id, due_date.toISOString().split('T')[0], salesOrder.subtotal, salesOrder.total_tax, salesOrder.grand_total, req.user.id, req.user.id]);
    
    const invoiceId = invoiceResult.rows[0].id;
    
    // Copy lines from sales order
    for (const line of linesResult.rows) {
      await pool.query(`
        INSERT INTO invoice_lines (invoice_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [invoiceId, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent, line.line_total, line.tax_amount, line.line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, after_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['CREATE_FROM_SO', 'invoice', invoiceId, req.user.id, JSON.stringify(invoiceResult.rows[0])]);
    
    res.status(201).json(invoiceResult.rows[0]);
  } catch (error) {
    console.error('Error creating invoice from sales order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;