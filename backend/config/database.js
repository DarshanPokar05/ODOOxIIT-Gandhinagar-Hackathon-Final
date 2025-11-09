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
        manager_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add manager_id column if it doesn't exist
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add company column if it doesn't exist
    await pool.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS company VARCHAR(255)
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
        INSERT INTO customers (name, email, phone, address, company) VALUES
        ('Acme Corp', 'contact@acme.com', '+1-555-0101', '123 Business St, City, State', 'Acme Corporation'),
        ('Tech Solutions Ltd', 'info@techsolutions.com', '+1-555-0102', '456 Innovation Ave, City, State', 'Tech Solutions Limited'),
        ('Global Industries', 'sales@global.com', '+1-555-0103', '789 Enterprise Blvd, City, State', 'Global Industries Inc'),
        ('StartupXYZ', 'hello@startupxyz.com', '+1-555-0104', '321 Innovation Hub, Tech City', 'StartupXYZ LLC'),
        ('Enterprise Co', 'business@enterprise.com', '+1-555-0105', '654 Corporate Plaza, Business District', 'Enterprise Company')
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

    // Ensure projects has cost/revenue/profit columns used by expenses/invoices
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS cost DECIMAL(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS revenue DECIMAL(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0
    `);
    
    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER REFERENCES projects(id),
        assigned_to INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert sample tasks if none exist
    const taskCount = await pool.query('SELECT COUNT(*) FROM tasks');
    if (parseInt(taskCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO tasks (title, name, description, project_id, status, priority) VALUES
        ('Frontend Development', 'Frontend Development', 'Develop the user interface components', 1, 'in_progress', 'high'),
        ('Backend API', 'Backend API', 'Create REST API endpoints', 1, 'todo', 'high'),
        ('Database Design', 'Database Design', 'Design and implement database schema', 2, 'completed', 'medium'),
        ('Mobile UI Design', 'Mobile UI Design', 'Design mobile application interface', 2, 'in_progress', 'medium'),
        ('Cloud Setup', 'Cloud Setup', 'Setup AWS infrastructure', 3, 'todo', 'low')
      `);
    }

    // Expenses table: stores user-submitted expenses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense_number VARCHAR(50) UNIQUE NOT NULL,
        project_id INTEGER REFERENCES projects(id),
        task_id INTEGER,
        submitted_by INTEGER REFERENCES users(id),
        submitted_at TIMESTAMP,
        expense_date DATE,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        exchange_rate DECIMAL(18,6) DEFAULT 1.0,
        amount_company_currency DECIMAL(18,2) DEFAULT 0,
        billable BOOLEAN DEFAULT FALSE,
        billable_to_customer_id INTEGER REFERENCES customers(id),
        receipt_url VARCHAR(1024),
        receipt_required BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','reimbursed','rejected')),
        approver_id INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        reimbursed_by INTEGER REFERENCES users(id),
        reimbursed_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Expense history / audit table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_history (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        change_reason TEXT,
        before_snapshot JSONB,
        after_snapshot JSONB,
        old_status VARCHAR(30),
        new_status VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Vendors table for purchase orders
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
    
    // Purchase orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INTEGER REFERENCES vendors(id),
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
    
    // Purchase order lines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
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
    
    // Insert sample vendors if none exist
    const vendorCount = await pool.query('SELECT COUNT(*) FROM vendors');
    if (parseInt(vendorCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO vendors (name, email, phone, address) VALUES
        ('Tech Supplies Inc', 'orders@techsupplies.com', '+1-555-0201', '100 Tech Park, Silicon Valley'),
        ('Office Solutions Ltd', 'sales@officesolutions.com', '+1-555-0202', '200 Business Ave, Downtown'),
        ('Global Hardware Co', 'info@globalhardware.com', '+1-555-0203', '300 Industrial Blvd, Tech City')
      `);
    }

    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
};

module.exports = { pool, createTables, testConnection };