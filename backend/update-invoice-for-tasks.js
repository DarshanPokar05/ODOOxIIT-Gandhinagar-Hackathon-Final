const { pool } = require('./config/database');

const updateInvoiceForTasks = async () => {
  try {
    // Drop the existing foreign key constraint and recreate for tasks
    await pool.query(`
      ALTER TABLE invoice_lines 
      DROP CONSTRAINT IF EXISTS invoice_lines_product_id_fkey
    `);
    
    // Rename product_id to task_id
    await pool.query(`
      ALTER TABLE invoice_lines 
      RENAME COLUMN product_id TO task_id
    `);
    
    // Add foreign key constraint to tasks table
    await pool.query(`
      ALTER TABLE invoice_lines 
      ADD CONSTRAINT invoice_lines_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    `);
    
    // Add hourly_rate column to tasks if not exists
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 100.00
    `);
    
    console.log('Invoice tables updated for tasks successfully');
  } catch (error) {
    console.error('Error updating invoice tables:', error);
    throw error;
  }
};

updateInvoiceForTasks()
  .then(() => {
    console.log('Update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });