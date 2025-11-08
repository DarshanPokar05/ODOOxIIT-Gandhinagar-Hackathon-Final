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
        is_verified BOOLEAN DEFAULT FALSE,
        otp VARCHAR(6),
        otp_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
};

module.exports = { pool, createTables, testConnection };