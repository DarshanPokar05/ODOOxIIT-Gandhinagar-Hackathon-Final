const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupProjectTables() {
  try {
    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'planned',
        start_date DATE,
        end_date DATE,
        deadline DATE,
        manager_id INTEGER REFERENCES users(id),
        tags TEXT[],
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER REFERENCES projects(id),
        assigned_to INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        hours_logged DECIMAL(5,2) DEFAULT 0,
        estimated_hours DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data
    await pool.query(`
      INSERT INTO projects (name, description, status, start_date, end_date, deadline, manager_id, tags, image_url) 
      VALUES 
      ('RD Services', 'Research and Development project for new services', 'in_progress', '2024-01-15', '2024-06-30', '2024-06-30', 1, ARRAY['Services', 'Customer Care'], 'https://via.placeholder.com/300x200/9f7aea/ffffff?text=RD+Services'),
      ('E-Commerce Platform', 'Building next-gen e-commerce solution', 'in_progress', '2024-02-01', '2024-08-15', '2024-08-15', 1, ARRAY['Development', 'Web'], 'https://via.placeholder.com/300x200/4299e1/ffffff?text=E-Commerce'),
      ('Mobile App Development', 'Cross-platform mobile application', 'planned', '2024-03-01', '2024-09-30', '2024-09-30', 1, ARRAY['Mobile', 'React Native'], 'https://via.placeholder.com/300x200/48bb78/ffffff?text=Mobile+App'),
      ('Data Analytics Dashboard', 'Business intelligence dashboard', 'completed', '2023-10-01', '2024-01-31', '2024-01-31', 1, ARRAY['Analytics', 'BI'], 'https://via.placeholder.com/300x200/ed8936/ffffff?text=Analytics'),
      ('Cloud Migration', 'Migrate infrastructure to cloud', 'on_hold', '2024-01-01', '2024-05-31', '2024-05-31', 1, ARRAY['Cloud', 'Infrastructure'], 'https://via.placeholder.com/300x200/e53e3e/ffffff?text=Cloud')
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO tasks (title, description, project_id, assigned_to, status, hours_logged, estimated_hours)
      VALUES 
      ('UI Design', 'Create user interface mockups', 1, 1, 'completed', 25.5, 30),
      ('API Development', 'Build REST API endpoints', 1, 1, 'in_progress', 15.0, 40),
      ('Database Setup', 'Configure database schema', 2, 1, 'completed', 12.0, 15),
      ('Frontend Development', 'Build React components', 2, 1, 'in_progress', 8.5, 50),
      ('Testing', 'Unit and integration testing', 3, 1, 'pending', 0, 20)
      ON CONFLICT DO NOTHING
    `);

    console.log('Project tables and sample data created successfully');
    await pool.end();
  } catch (error) {
    console.error('Error setting up project tables:', error);
    process.exit(1);
  }
}

setupProjectTables();