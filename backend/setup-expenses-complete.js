const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'auth_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function setupExpensesComplete() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create customers table if not exists (for billable expenses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create company_settings table for configuration
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default company settings
    await client.query(`
      INSERT INTO company_settings (setting_key, setting_value) 
      VALUES 
        ('default_currency', 'USD'),
        ('receipt_required_threshold', '100.00'),
        ('expense_approval_required', 'true')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    // Drop existing expenses table if exists to recreate with complete schema
    await client.query('DROP TABLE IF EXISTS expense_history CASCADE');
    await client.query('DROP TABLE IF EXISTS expenses CASCADE');

    // Create comprehensive expenses table
    await client.query(`
      CREATE TABLE expenses (
        id SERIAL PRIMARY KEY,
        expense_number VARCHAR(50) UNIQUE NOT NULL,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        task_id INTEGER REFERENCES tasks(id),
        submitted_by INTEGER NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP,
        expense_date DATE NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('Travel', 'Software', 'Hardware', 'Meals', 'Other')),
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) DEFAULT 'USD',
        exchange_rate DECIMAL(10,6) DEFAULT 1.0,
        amount_company_currency DECIMAL(15,2),
        billable BOOLEAN DEFAULT FALSE,
        billable_to_customer_id INTEGER REFERENCES customers(id),
        receipt_url VARCHAR(500),
        receipt_required BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'reimbursed', 'rejected')),
        approver_id INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        reimbursed_by INTEGER REFERENCES users(id),
        reimbursed_at TIMESTAMP,
        invoice_line_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id)
      )
    `);

    // Create expense history table for audit trail
    await client.query(`
      CREATE TABLE expense_history (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        changed_by INTEGER NOT NULL REFERENCES users(id),
        change_reason TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        before_snapshot JSONB,
        after_snapshot JSONB
      )
    `);

    // Create indexes for performance
    await client.query('CREATE INDEX idx_expenses_project_id ON expenses(project_id)');
    await client.query('CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by)');
    await client.query('CREATE INDEX idx_expenses_status ON expenses(status)');
    await client.query('CREATE INDEX idx_expenses_expense_date ON expenses(expense_date)');
    await client.query('CREATE INDEX idx_expense_history_expense_id ON expense_history(expense_id)');

    // Create function to auto-calculate company currency amount
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_company_amount()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.amount_company_currency = NEW.amount * NEW.exchange_rate;
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for auto-calculation
    await client.query(`
      CREATE TRIGGER trigger_calculate_company_amount
        BEFORE INSERT OR UPDATE ON expenses
        FOR EACH ROW
        EXECUTE FUNCTION calculate_company_amount();
    `);

    // Create function to check receipt requirement
    await client.query(`
      CREATE OR REPLACE FUNCTION check_receipt_requirement()
      RETURNS TRIGGER AS $$
      DECLARE
        threshold DECIMAL(15,2);
      BEGIN
        SELECT CAST(setting_value AS DECIMAL(15,2)) INTO threshold
        FROM company_settings 
        WHERE setting_key = 'receipt_required_threshold';
        
        IF threshold IS NULL THEN
          threshold = 100.00;
        END IF;
        
        NEW.receipt_required = (NEW.amount >= threshold);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for receipt requirement
    await client.query(`
      CREATE TRIGGER trigger_check_receipt_requirement
        BEFORE INSERT OR UPDATE ON expenses
        FOR EACH ROW
        EXECUTE FUNCTION check_receipt_requirement();
    `);

    // Insert sample customers
    await client.query(`
      INSERT INTO customers (name, email, phone, address) VALUES
      ('Acme Corporation', 'billing@acme.com', '+1-555-0101', '123 Business St, City, State 12345'),
      ('Tech Solutions Inc', 'accounts@techsolutions.com', '+1-555-0102', '456 Innovation Ave, Tech City, TC 67890'),
      ('Global Enterprises', 'finance@globalent.com', '+1-555-0103', '789 Corporate Blvd, Metro, MT 54321')
    `);

    await client.query('COMMIT');
    console.log('Complete expenses module setup completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up expenses module:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to generate expense number
async function generateExpenseNumber(client) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `EXP-${year}${month}`;
  
  const result = await client.query(`
    SELECT expense_number FROM expenses 
    WHERE expense_number LIKE $1 
    ORDER BY expense_number DESC 
    LIMIT 1
  `, [`${prefix}-%`]);
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].expense_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

if (require.main === module) {
  setupExpensesComplete()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupExpensesComplete, generateExpenseNumber };