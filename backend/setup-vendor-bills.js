const { pool } = require('./config/database');

const setupVendorBills = async () => {
  try {
    // Create vendor_bills table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_bills (
        id SERIAL PRIMARY KEY,
        bill_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INTEGER REFERENCES vendors(id) NOT NULL,
        project_id INTEGER REFERENCES projects(id) NOT NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'paid', 'cancelled')),
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

    // Create vendor_bill_lines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_bill_lines (
        id SERIAL PRIMARY KEY,
        vendor_bill_id INTEGER REFERENCES vendor_bills(id) ON DELETE CASCADE,
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

    // Add cost column to projects table if not exists
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS cost DECIMAL(15,2) DEFAULT 0
    `);

    console.log('Vendor Bills tables created successfully');
  } catch (error) {
    console.error('Error setting up vendor bills:', error);
    throw error;
  }
};

if (require.main === module) {
  setupVendorBills()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupVendorBills };