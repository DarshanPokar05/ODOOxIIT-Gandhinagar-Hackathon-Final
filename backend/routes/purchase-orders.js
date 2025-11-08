const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken: auth } = require('../middleware/auth');
const router = express.Router();

// Generate PO number
const generatePONumber = async (client) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PO-${year}${month}-`;
  
  const result = await client.query(
    'SELECT po_number FROM purchase_orders WHERE po_number LIKE $1 ORDER BY po_number DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].po_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Get vendors
router.get('/vendors/list', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all purchase orders
router.get('/', auth, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT po.*, v.name as vendor_name, p.name as project_name, 
             u.first_name || ' ' || u.last_name as created_by_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN projects p ON po.project_id = p.id
      LEFT JOIN users u ON po.created_by = u.id
    `;
    
    const params = [];
    if (project_id) {
      query += ' WHERE po.project_id = $1';
      params.push(project_id);
    }
    
    query += ' ORDER BY po.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single purchase order with lines
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const poResult = await pool.query(`
      SELECT po.*, v.name as vendor_name, p.name as project_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN projects p ON po.project_id = p.id
      WHERE po.id = $1
    `, [id]);
    
    if (poResult.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const linesResult = await pool.query(`
      SELECT pol.*, pr.name as product_name
      FROM purchase_order_lines pol
      JOIN products pr ON pol.product_id = pr.id
      WHERE pol.purchase_order_id = $1
      ORDER BY pol.id
    `, [id]);
    
    const purchaseOrder = {
      ...poResult.rows[0],
      lines: linesResult.rows
    };
    
    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create purchase order
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Creating purchase order with data:', req.body);
    console.log('User:', req.user);

    const { vendor_id, project_id, order_date, notes, lines } = req.body;

    // Validation
    if (!vendor_id || !project_id || !lines || lines.length === 0) {
      return res.status(400).json({ message: 'Vendor, project, and at least one line item are required' });
    }

    await client.query('BEGIN');

    // Generate PO number (use helper for stable numbering)
    const po_number = await generatePONumber(client);

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

    // Insert purchase order
    const poResult = await client.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, project_id, order_date, notes, subtotal, total_tax, grand_total, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [po_number, vendor_id, project_id, order_date || new Date().toISOString().split('T')[0], notes || '', subtotal, total_tax, grand_total, req.user.id, req.user.id]);

    const purchaseOrderId = poResult.rows[0].id;

    // Insert lines
    for (const line of lines) {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;

      await client.query(`
        INSERT INTO purchase_order_lines (purchase_order_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [purchaseOrderId, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line_total, tax_amount, line_grand_total]);
    }

    // Log audit (use existing audit_logs columns: action, entity, entity_id, user_id, before_values, after_values)
    try {
      await client.query(`
        INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['CREATE', 'purchase_order', purchaseOrderId, req.user.id, null, JSON.stringify(poResult.rows[0])]);
    } catch (auditErr) {
      console.error('Audit log error (create PO):', auditErr);
      // do not fail creation if audit log fails
    }

    await client.query('COMMIT');

    res.status(201).json(poResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// Update purchase order
router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { vendor_id, project_id, order_date, notes, lines } = req.body;
    
    // Check if PO exists and is in draft status
    const existingPO = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existingPO.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    if (existingPO.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Cannot update confirmed purchase order' });
    }
    
    // Calculate totals
    let subtotal = 0;
    let total_tax = 0;
    
    const calculatedLines = lines.map(line => {
      const line_total = parseFloat(line.quantity) * parseFloat(line.unit_price);
      const tax_amount = line_total * (parseFloat(line.tax_percent || 0) / 100);
      const line_grand_total = line_total + tax_amount;
      
      subtotal += line_total;
      total_tax += tax_amount;
      
      return {
        ...line,
        line_total,
        tax_amount,
        line_grand_total
      };
    });
    
    const grand_total = subtotal + total_tax;
    
    // Update purchase order
    const poResult = await client.query(`
      UPDATE purchase_orders 
      SET vendor_id = $1, project_id = $2, order_date = $3, notes = $4, subtotal = $5, total_tax = $6, grand_total = $7, updated_by = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [vendor_id, project_id, order_date, notes, subtotal, total_tax, grand_total, req.user.id, id]);
    
    // Delete existing lines
    await client.query('DELETE FROM purchase_order_lines WHERE purchase_order_id = $1', [id]);
    
    // Insert new lines
    for (const line of calculatedLines) {
      await client.query(`
        INSERT INTO purchase_order_lines (purchase_order_id, product_id, quantity, unit, unit_price, tax_percent, line_total, tax_amount, line_grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, line.product_id, line.quantity, line.unit, line.unit_price, line.tax_percent || 0, line.line_total, line.tax_amount, line.line_grand_total]);
    }
    
    // Log audit
    await client.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['UPDATE', 'purchase_order', id, req.user.id, JSON.stringify(existingPO.rows[0]), JSON.stringify(poResult.rows[0])]);
    
    await client.query('COMMIT');
    res.json(poResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating purchase order:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Confirm purchase order
router.post('/confirm/:id', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const existingPO = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existingPO.rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    if (existingPO.rows[0].status !== 'draft') {
      return res.status(400).json({ message: 'Purchase order is already confirmed' });
    }
    
    const result = await client.query(`
      UPDATE purchase_orders 
      SET status = 'confirmed', updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    // Log audit
    await client.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['CONFIRM', 'purchase_order', id, req.user.id, JSON.stringify(existingPO.rows[0]), JSON.stringify(result.rows[0])]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming purchase order:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;