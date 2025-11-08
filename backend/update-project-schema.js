const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateProjectSchema() {
  try {
    // Add new columns to projects table
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'
    `);

    console.log('Project schema updated successfully');
    await pool.end();
  } catch (error) {
    console.error('Error updating project schema:', error);
    process.exit(1);
  }
}

updateProjectSchema();