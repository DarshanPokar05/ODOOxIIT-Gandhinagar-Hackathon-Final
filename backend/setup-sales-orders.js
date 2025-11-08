const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const createSalesOrderTables = async () => {
  try {
    // Create customers table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sales_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        project_id INTEGER REFERENCES projects(id),
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
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

    // Create sales_order_lines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_order_lines (
        id SERIAL PRIMARY KEY,
        sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
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

    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        before_data JSONB,
        after_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample customers
    await pool.query(`
      INSERT INTO customers (name, email, phone, address) VALUES
      ('Acme Corp', 'contact@acme.com', '+1-555-0101', '123 Business St, City, State'),
      ('Tech Solutions Ltd', 'info@techsolutions.com', '+1-555-0102', '456 Innovation Ave, City, State'),
      ('Global Industries', 'sales@global.com', '+1-555-0103', '789 Enterprise Blvd, City, State')
      ON CONFLICT DO NOTHING
    `);

    console.log('Sales Order tables created successfully');
  } catch (error) {
    console.error('Error creating sales order tables:', error);
  }
};

createSalesOrderTables();