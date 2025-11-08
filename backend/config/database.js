const path = require('path');
const { Pool } = require('pg');
// Load .env from the backend folder explicitly so variables are available
// even when node is started from a different working directory.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection error:', err.message);
    return false;
  }
};

// Create tables
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'team_member',
        status VARCHAR(20) DEFAULT 'active',
        is_verified BOOLEAN DEFAULT FALSE,
        otp VARCHAR(6),
        otp_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type_sales BOOLEAN DEFAULT FALSE,
        type_purchase BOOLEAN DEFAULT FALSE,
        type_expenses BOOLEAN DEFAULT FALSE,
        sales_price DECIMAL(10,2),
        sales_tax_percent DECIMAL(5,2),
        cost_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        budget DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        entity VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id),
        before_values JSONB,
        after_values JSONB,
        table_name VARCHAR(50),
        record_id INTEGER,
        before_data JSONB,
        after_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample customers if none exist
    const customerCount = await pool.query('SELECT COUNT(*) FROM customers');
    if (parseInt(customerCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO customers (name, email, phone, address) VALUES
        ('Acme Corp', 'contact@acme.com', '+1-555-0101', '123 Business St, City, State'),
        ('Tech Solutions Ltd', 'info@techsolutions.com', '+1-555-0102', '456 Innovation Ave, City, State'),
        ('Global Industries', 'sales@global.com', '+1-555-0103', '789 Enterprise Blvd, City, State')
      `);
    }

    // Insert sample projects if none exist
    const projectCount = await pool.query('SELECT COUNT(*) FROM projects');
    if (parseInt(projectCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO projects (name, description, status, start_date, budget) VALUES
        ('Website Redesign', 'Complete website overhaul with modern design', 'active', CURRENT_DATE, 50000.00),
        ('Mobile App Development', 'iOS and Android mobile application', 'active', CURRENT_DATE, 120000.00),
        ('Cloud Migration', 'Migrate infrastructure to AWS', 'planning', CURRENT_DATE, 80000.00)
      `);
    }

    // Insert sample products if none exist
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (name, type_sales, type_purchase, type_expenses, sales_price, sales_tax_percent, cost_price) VALUES
        ('Web Development Service', true, false, false, 150.00, 10.00, 100.00),
        ('Mobile App Development', true, false, false, 200.00, 10.00, 150.00),
        ('Cloud Hosting', true, false, true, 50.00, 5.00, 30.00),
        ('Consulting Hours', true, false, false, 120.00, 8.00, 80.00),
        ('Software License', false, true, true, 0.00, 0.00, 500.00)
      `);
    }

    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
};

module.exports = { pool, createTables, testConnection };