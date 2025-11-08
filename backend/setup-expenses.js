const { pool } = require('./config/database');

const setupExpenses = async () => {
  try {
    // Create expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense_number VARCHAR(50) UNIQUE NOT NULL,
        project_id INTEGER REFERENCES projects(id) NOT NULL,
        task_id INTEGER REFERENCES tasks(id),
        submitted_by INTEGER REFERENCES users(id) NOT NULL,
        submitted_at TIMESTAMP,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        category VARCHAR(50) NOT NULL CHECK (category IN ('Travel', 'Software', 'Hardware', 'Meals', 'Other')),
        description TEXT,
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) DEFAULT 'USD',
        exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
        amount_company_currency DECIMAL(15,2) NOT NULL,
        billable BOOLEAN DEFAULT FALSE,
        billable_to_customer_id INTEGER REFERENCES customers(id),
        receipt_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'reimbursed', 'rejected')),
        approver_id INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        reimbursed_by INTEGER REFERENCES users(id),
        reimbursed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expense_history table for audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_history (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        before_data JSONB,
        after_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Expenses tables created successfully');
  } catch (error) {
    console.error('Error setting up expenses:', error);
    throw error;
  }
};

if (require.main === module) {
  setupExpenses()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupExpenses };