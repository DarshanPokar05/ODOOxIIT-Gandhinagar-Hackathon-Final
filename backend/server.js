const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from backend folder explicitly so environment variables
// (like DB_PASSWORD) are available even if node is started from repo root.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createTables, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', status: 'OK' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Cannot connect to database. Please check your PostgreSQL connection.');
      process.exit(1);
    }
    
    await createTables();
    // Start server and attach error handler so we don't crash with an unhandled
    // 'error' event (for example EADDRINUSE when the port is already taken).
    const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    const server = app.listen(portNumber);

    server.on('listening', () => {
      console.log(`Server running on port ${portNumber}`);
      console.log(`Health check: http://localhost:${portNumber}/api/health`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${portNumber} is already in use. Please stop the process using that port or set a different PORT.`);
        process.exit(1);
      }
      console.error('Server failed to start:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();