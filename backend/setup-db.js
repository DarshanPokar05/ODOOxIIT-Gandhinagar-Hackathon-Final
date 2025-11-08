const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Connect to postgres database first to create auth_db
const adminPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  try {
    // Check if database exists
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      // Create database if it doesn't exist
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database ${process.env.DB_NAME} created successfully`);
    } else {
      console.log(`Database ${process.env.DB_NAME} already exists`);
    }

    await adminPool.end();

    // Now connect to the auth_db and create tables
    const appPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await appPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'team_member',
        is_verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        profile_picture VARCHAR(255),
        otp VARCHAR(6),
        otp_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add profile_picture column if it doesn't exist
    await appPool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)
    `);

    console.log('Tables created successfully');
    await appPool.end();
    
  } catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
  }
}

setupDatabase();