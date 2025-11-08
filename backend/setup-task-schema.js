const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupTaskSchema() {
  try {
    // Update tasks table with additional fields
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS task_id VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS deadline DATE,
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS role VARCHAR(100),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Create subtasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attachments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create time logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        hours DECIMAL(5,2) NOT NULL,
        date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create activity logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_activity_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generate task IDs for existing tasks
    await pool.query(`
      UPDATE tasks 
      SET task_id = 'TASK-' || LPAD(id::text, 5, '0')
      WHERE task_id IS NULL
    `);

    // Insert sample data
    await pool.query(`
      INSERT INTO subtasks (task_id, title, is_completed) VALUES
      (1, 'Create wireframes', true),
      (1, 'Design mockups', true),
      (1, 'User testing', false),
      (2, 'Setup endpoints', true),
      (2, 'Database integration', false),
      (2, 'API documentation', false)
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO task_comments (task_id, user_id, comment) VALUES
      (1, 1, 'Initial design concepts are ready for review'),
      (1, 1, 'Updated based on client feedback'),
      (2, 1, 'API structure looks good, proceeding with implementation')
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO time_logs (task_id, user_id, hours, date, note) VALUES
      (1, 1, 4.5, CURRENT_DATE - INTERVAL '2 days', 'Working on UI mockups'),
      (1, 1, 3.0, CURRENT_DATE - INTERVAL '1 day', 'Client feedback integration'),
      (2, 1, 6.0, CURRENT_DATE, 'API development')
      ON CONFLICT DO NOTHING
    `);

    console.log('Task schema and sample data created successfully');
    await pool.end();
  } catch (error) {
    console.error('Error setting up task schema:', error);
    process.exit(1);
  }
}

setupTaskSchema();