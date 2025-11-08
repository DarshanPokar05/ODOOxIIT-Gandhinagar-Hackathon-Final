const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();

// Generate Bill number
const generateBillNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `BILL-${year}${month}-`;
  
  const result = await pool.query(
    'SELECT bill_number FROM vendor_bills WHERE bill_number LIKE $1 ORDER BY bill_number DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].bill_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Get all vendor bills
router.get('/', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT vb.*, v.name as vendor_name, p.name as project_name, 
             u.first_name || ' ' || u.last_name as created_by_name,
             po.po_number
      FROM vendor_bills vb
      JOIN vendors v ON vb.vendor_id = v.id
      JOIN projects p ON vb.project_id = p.id
      LEFT JOIN users u ON vb.created_by = u.id
      LEFT JOIN purchase_orders po ON vb.purchase_order_id = po.id
    `;
    
    const params = [];
    if (project_id) {
      query += ' WHERE vb.project_id = $1';
      params.push(project_id);
    }
    
    query += ' ORDER BY vb.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendor bills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single vendor bill with lines
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const billResult = await pool.query(`
      SELECT vb.*, v.name as vendor_name, p.name as project_name, po.po_number
      FROM vendor_bills vb
      JOIN vendors v ON vb.vendor_id = v.id
      JOIN projects p ON vb.project_id = p.id
      LEFT JOIN purchase_orders po ON vb.purchase_order_id = po.id
      WHERE vb.id = $1
    `, [id]);
    
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor bill not found' });
    }
    
    const linesResult = await pool.query(`
      SELECT vbl.*, pr.name as product_name
      FROM vendor_bill_lines vbl
      JOIN products pr ON vbl.product_id = pr.id
      WHERE vbl.vendor_bill_id = $1
      ORDER BY vbl.id
    `, [id]);
    
    const vendorBill = {
      ...billResult.rows[0],
      lines: linesResult.rows
    };
    
    res.json(vendorBill);
  } catch (error) {
    console.error('Error fetching vendor bill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create vendor bill
router.post('/', auth, async (req, res) => {
  try {
    const { vendor_id, project_id, purchase_order_id, bill_date, due_date, notes, lines } = req.body;
    
    // Validation
    if (!vendor_id || !project_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Vendor, project, and at least one line item are required' });
    }
    
    const bill_number = await generateBillNumber();
    
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
    
    // Insert vendor bill
    const billResult = await pool.query(`
      INSERT INTO vendor_bills (bill_number, vendor_id, project_id, purchase_order_id, bill_date, due_date, notes, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [bill_number, vendor_id, project_id, purchase_order_id, bill_date || new Date().toISOString().split('T')[0], due_date, notes || '', subtotal, total_tax, grand_total, req.user.id, req.user.id]);
    
    const billId = billResult.rows[0].id;
    
    // Insert lines
    for (const line of lines) {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;
      
      await pool.query(`
        INSERT INTO vendor_bill_lines (vendor_bill_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [billId, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line_total, tax_amount, line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, after_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['CREATE', 'vendor_bill', billId, req.user.id, JSON.stringify(billResult.rows[0])]);
    
    res.status(201).json(billResult.rows[0]);
  } catch (error) {
    console.error('Error creating vendor bill:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update vendor bill (only in draft status)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_id, project_id, bill_date, due_date, notes, lines } = req.body;
    
    const existingBill = await pool.query('SELECT * FROM vendor_bills WHERE id = $1', [id]);
    if (existingBill.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor bill not found' });
    }
    
    if (existingBill.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Cannot update posted vendor bill' });
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
    
    // Update vendor bill
    const billResult = await pool.query(`
      UPDATE vendor_bills 
      SET vendor_id = $1, project_id = $2, bill_date = $3, due_date = $4, notes = $5, subtotal = $6, total_tax = $7, grand_total = $8, updated_by = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [vendor_id, project_id, bill_date, due_date, notes, subtotal, total_tax, grand_total, req.user.id, id]);
    
    // Delete existing lines and insert new ones
    await pool.query('DELETE FROM vendor_bill_lines WHERE vendor_bill_id = $1', [id]);
    
    for (const line of lines) {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;
      
      await pool.query(`
        INSERT INTO vendor_bill_lines (vendor_bill_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line_total, tax_amount, line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['UPDATE', 'vendor_bill', id, req.user.id, JSON.stringify(existingBill.rows[0]), JSON.stringify(billResult.rows[0])]);
    
    res.json(billResult.rows[0]);
  } catch (error) {
    console.error('Error updating vendor bill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Post vendor bill
router.post('/post/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingBill = await pool.query('SELECT * FROM vendor_bills WHERE id = $1', [id]);
    if (existingBill.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor bill not found' });
    }
    
    if (existingBill.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Vendor bill is already posted' });
    }
    
    const result = await pool.query(`
      UPDATE vendor_bills 
      SET status = 'posted', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['POST', 'vendor_bill', id, req.user.id, JSON.stringify(existingBill.rows[0]), JSON.stringify(result.rows[0])]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error posting vendor bill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark vendor bill as paid
router.post('/mark-paid/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingBill = await pool.query('SELECT * FROM vendor_bills WHERE id = $1', [id]);
    if (existingBill.rows.length === 0) {
      return res.status(404).json({ message: 'Vendor bill not found' });
    }
    
    if (existingBill.rows[0].status !== 'posted') {
      return res.status(400).json({ message: 'Vendor bill must be posted before marking as paid' });
    }
    
    const result = await pool.query(`
      UPDATE vendor_bills 
      SET status = 'paid', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Update project cost
    await pool.query(`
      UPDATE projects 
      SET cost = COALESCE(cost, 0) + $1
      WHERE id = $2
    `, [existingBill.rows[0].grand_total, existingBill.rows[0].project_id]);
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['MARK_PAID', 'vendor_bill', id, req.user.id, JSON.stringify(existingBill.rows[0]), JSON.stringify(result.rows[0])]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking vendor bill as paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create vendor bill from purchase order
router.post('/from-po/:po_id', auth, async (req, res) => {
  try {
    const { po_id } = req.params;
    
    // Get purchase order with lines
    const poResult = await pool.query(`
      SELECT po.*, v.name as vendor_name, p.name as project_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN projects p ON po.project_id = p.id
      WHERE po.id = $1 AND po.status = 'confirmed'
    `, [po_id]);
    
    if (poResult.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found or not confirmed' });
    }
    
    const purchaseOrder = poResult.rows[0];
    
    const linesResult = await pool.query(`
      SELECT pol.*, pr.name as product_name
      FROM purchase_order_lines pol
      JOIN products pr ON pol.product_id = pr.id
      WHERE pol.purchase_order_id = $1
    `, [po_id]);
    
    const bill_number = await generateBillNumber();
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30); // 30 days from today
    
    // Create vendor bill
    const billResult = await pool.query(`
      INSERT INTO vendor_bills (bill_number, vendor_id, project_id, purchase_order_id, due_date, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [bill_number, purchaseOrder.vendor_id, purchaseOrder.project_id, po_id, due_date.toISOString().split('T')[0], purchaseOrder.subtotal, purchaseOrder.total_tax, purchaseOrder.grand_total, req.user.id, req.user.id]);
    
    const billId = billResult.rows[0].id;
    
    // Copy lines from purchase order
    for (const line of linesResult.rows) {
      await pool.query(`
        INSERT INTO vendor_bill_lines (vendor_bill_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [billId, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent, line.line_total, line.tax_amount, line.line_grand_total]);
    }
    
    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, after_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['CREATE_FROM_PO', 'vendor_bill', billId, req.user.id, JSON.stringify(billResult.rows[0])]);
    
    res.status(201).json(billResult.rows[0]);
  } catch (error) {
    console.error('Error creating vendor bill from purchase order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;