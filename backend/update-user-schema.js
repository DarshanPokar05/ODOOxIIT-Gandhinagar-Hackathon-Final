const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
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

    // Ensure profile_picture column exists (some earlier setups omitted it)
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)
    `);

    console.log('User schema updated successfully');
    await pool.end();
  } catch (error) {
    console.error('Error updating user schema:', error);
    process.exit(1);
  }
}

updateUserSchema();