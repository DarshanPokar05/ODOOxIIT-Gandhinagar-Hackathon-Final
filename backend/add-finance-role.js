const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const addFinanceRole = async () => {
  try {
    // Add finance_manager user for testing
    await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_verified) 
      VALUES ('finance@oneflow.com', '$2b$10$example', 'Finance', 'Manager', 'finance_manager', true)
      ON CONFLICT (email) DO UPDATE SET role = 'finance_manager'
    `);
    
    console.log('Finance manager role added successfully');
  } catch (error) {
    console.error('Error adding finance role:', error);
  } finally {
    await pool.end();
  }
};

addFinanceRole();