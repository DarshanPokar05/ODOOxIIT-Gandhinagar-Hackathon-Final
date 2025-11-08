const { pool } = require('./config/database');

const setupInvoices = async () => {
  try {
    // Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id) NOT NULL,
        project_id INTEGER REFERENCES projects(id) NOT NULL,
        sales_order_id INTEGER REFERENCES sales_orders(id),
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
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

    // Create invoice_lines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_lines (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
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

    console.log('Invoice tables created successfully');
  } catch (error) {
    console.error('Error setting up invoices:', error);
    throw error;
  }
};

if (require.main === module) {
  setupInvoices()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupInvoices };