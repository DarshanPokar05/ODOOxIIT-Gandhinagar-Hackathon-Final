const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const router = express.Router();

// Create product
router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager']),
  body('name').trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('type_sales').isBoolean().optional(),
  body('type_purchase').isBoolean().optional(),
  body('type_expenses').isBoolean().optional(),
  body('sales_price').optional().isFloat({ min: 0 }).withMessage('Sales price must be positive'),
  body('sales_tax_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax percent must be 0-100'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type_sales, type_purchase, type_expenses, sales_price, sales_tax_percent, cost_price } = req.body;

    // Validation: At least one type must be selected
    if (!type_sales && !type_purchase && !type_expenses) {
      return res.status(400).json({ message: 'At least one product type must be selected' });
    }

    // Validation: Sales type requires sales price and tax
    if (type_sales && (!sales_price || sales_tax_percent === undefined)) {
      return res.status(400).json({ message: 'Sales price and tax percent are required for sales products' });
    }

    // Validation: Purchase/Expense types require cost price
    if ((type_purchase || type_expenses) && !cost_price) {
      return res.status(400).json({ message: 'Cost price is required for purchase/expense products' });
    }

    // Check if product name already exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE name = $1', [name]);
    if (existingProduct.rows.length > 0) {
      return res.status(400).json({ message: 'Product name already exists' });
    }

    const result = await pool.query(`
      INSERT INTO products (name, type_sales, type_purchase, type_expenses, sales_price, sales_tax_percent, cost_price, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, !!type_sales, !!type_purchase, !!type_expenses, sales_price, sales_tax_percent, cost_price, req.user.id, req.user.id]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, after_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['CREATED', 'PRODUCT', result.rows[0].id, req.user.id, JSON.stringify(result.rows[0])]);

    res.status(201).json({ message: 'Product created successfully', product: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products with search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND name ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const products = await pool.query(query, params);
    res.json(products.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (product.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'project_manager']),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Product name is required'),
  body('type_sales').isBoolean().optional(),
  body('type_purchase').isBoolean().optional(),
  body('type_expenses').isBoolean().optional(),
  body('sales_price').optional().isFloat({ min: 0 }).withMessage('Sales price must be positive'),
  body('sales_tax_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax percent must be 0-100'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, type_sales, type_purchase, type_expenses, sales_price, sales_tax_percent, cost_price } = req.body;

    // Get existing product
    const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const beforeValues = existingProduct.rows[0];

    // Check name uniqueness if name is being updated
    if (name && name !== beforeValues.name) {
      const nameExists = await pool.query('SELECT id FROM products WHERE name = $1 AND id != $2', [name, id]);
      if (nameExists.rows.length > 0) {
        return res.status(400).json({ message: 'Product name already exists' });
      }
    }

    // Validation: At least one type must be selected
    const finalTypeSales = type_sales !== undefined ? type_sales : beforeValues.type_sales;
    const finalTypePurchase = type_purchase !== undefined ? type_purchase : beforeValues.type_purchase;
    const finalTypeExpenses = type_expenses !== undefined ? type_expenses : beforeValues.type_expenses;

    if (!finalTypeSales && !finalTypePurchase && !finalTypeExpenses) {
      return res.status(400).json({ message: 'At least one product type must be selected' });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (type_sales !== undefined) {
      updates.push(`type_sales = $${paramCount}`);
      values.push(type_sales);
      paramCount++;
    }
    if (type_purchase !== undefined) {
      updates.push(`type_purchase = $${paramCount}`);
      values.push(type_purchase);
      paramCount++;
    }
    if (type_expenses !== undefined) {
      updates.push(`type_expenses = $${paramCount}`);
      values.push(type_expenses);
      paramCount++;
    }
    if (sales_price !== undefined) {
      updates.push(`sales_price = $${paramCount}`);
      values.push(sales_price);
      paramCount++;
    }
    if (sales_tax_percent !== undefined) {
      updates.push(`sales_tax_percent = $${paramCount}`);
      values.push(sales_tax_percent);
      paramCount++;
    }
    if (cost_price !== undefined) {
      updates.push(`cost_price = $${paramCount}`);
      values.push(cost_price);
      paramCount++;
    }

    updates.push(`updated_by = $${paramCount}`);
    values.push(req.user.id);
    paramCount++;
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values, after_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['UPDATED', 'PRODUCT', id, req.user.id, JSON.stringify(beforeValues), JSON.stringify(result.rows[0])]);

    res.json({ message: 'Product updated successfully', product: result.rows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', [
  authenticateToken,
  authorizeRole(['admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (action, entity, entity_id, user_id, before_values)
      VALUES ($1, $2, $3, $4, $5)
    `, ['DELETED', 'PRODUCT', id, req.user.id, JSON.stringify(existingProduct.rows[0])]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;