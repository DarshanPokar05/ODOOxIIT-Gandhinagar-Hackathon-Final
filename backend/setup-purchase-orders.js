const { pool } = require('./config/database');

const setupPurchaseOrders = async () => {
  try {
    // Create vendors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create purchase_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INTEGER REFERENCES vendors(id) NOT NULL,
        project_id INTEGER REFERENCES projects(id) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        subtotal DECIMAL(15,2) DEFAULT 0,
        total_tax DECIMAL(15,2) DEFAULT 0,
        grand_total DECIMAL(15,2) DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create purchase_order_lines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
        unit VARCHAR(50) NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price > 0),
        tax_percent DECIMAL(5,2) DEFAULT 0 CHECK (tax_percent >= 0),
        line_total DECIMAL(15,2) NOT NULL,
        tax_amount DECIMAL(15,2) NOT NULL,
        line_grand_total DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample vendors if none exist
    const vendorCount = await pool.query('SELECT COUNT(*) FROM vendors');
    if (parseInt(vendorCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO vendors (name, email, phone, address) VALUES
        ('Office Supplies Co', 'orders@officesupplies.com', '+1-555-0201', '100 Supply St, City, State'),
        ('Tech Hardware Ltd', 'sales@techhardware.com', '+1-555-0202', '200 Hardware Ave, City, State'),
        ('Software Solutions Inc', 'billing@softwaresol.com', '+1-555-0203', '300 Software Blvd, City, State')
      `);
    }

    console.log('Purchase Orders tables created successfully');
  } catch (error) {
    console.error('Error setting up purchase orders:', error);
    throw error;
  }
};

if (require.main === module) {
  setupPurchaseOrders()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupPurchaseOrders };