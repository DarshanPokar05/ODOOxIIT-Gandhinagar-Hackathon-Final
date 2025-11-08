const { pool } = require('./config/database');

const addRevenueColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS revenue DECIMAL(15,2) DEFAULT 0
    `);
    
    console.log('Revenue column added to projects table');
  } catch (error) {
    console.error('Error adding revenue column:', error);
  }
};

addRevenueColumn()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });