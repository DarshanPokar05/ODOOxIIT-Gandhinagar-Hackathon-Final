const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateUserSchema() {
  try {
    // Add status column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);

    console.log('User schema updated successfully');
    await pool.end();
  } catch (error) {
    console.error('Error updating user schema:', error);
    process.exit(1);
  }
}

updateUserSchema();