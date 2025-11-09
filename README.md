#Video Link --> https://drive.google.com/file/d/1dnmCFrmp3um53hTbORhQfNyG7FWfqXZ6/view?usp=sharing

# Authentication System with Role-Based Dashboards

A complete authentication system with email OTP verification and role-based access control.

## Features

- **User Registration**: Sign up with work email and personal details
- **Email OTP Verification**: Secure email verification using 6-digit OTP
- **Role-Based Authentication**: Three user roles (Admin, Project Manager, Team Member)
- **Protected Routes**: Role-based access to different dashboard views
- **JWT Authentication**: Secure token-based authentication
- **PostgreSQL Database**: Robust data storage

## Tech Stack

**Backend:**
- Node.js with Express
- PostgreSQL database
- JWT for authentication
- Nodemailer for email OTP
- bcryptjs for password hashing

**Frontend:**
- React with TypeScript
- React Router for navigation
- Axios for API calls
- Context API for state management

## Setup Instructions

### 1. Database Setup

1. Install PostgreSQL on your system
2. Create a new database:
   ```sql
   CREATE DATABASE auth_db;
   ```

### 2. Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=auth_db
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   JWT_SECRET=your_jwt_secret_key_here
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Start the React development server:
   ```bash
   npm start
   ```

## User Workflow

1. **Sign Up**: User registers with work email, name, password, and role
2. **Email Verification**: System sends 6-digit OTP to user's email
3. **OTP Verification**: User enters OTP to verify email address
4. **Login**: User logs in with email and password
5. **Dashboard Access**: User is redirected to role-specific dashboard

## User Roles & Permissions

- **Admin**: Full system access, can view all dashboards
- **Project Manager**: Can access project management features and team member dashboard
- **Team Member**: Basic dashboard access with task management

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/verify-otp` - Email OTP verification
- `POST /api/auth/login` - User login

### Dashboards
- `GET /api/dashboard/admin` - Admin dashboard data
- `GET /api/dashboard/project-manager` - Project manager dashboard data
- `GET /api/dashboard/team-member` - Team member dashboard data

## Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for the application
3. Use the App Password in the `EMAIL_PASS` environment variable

## Database Schema

```sql
CREATE TABLE users (
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
);
```

## Running the Application

1. Start PostgreSQL service
2. Run backend: `cd backend && npm run dev`
3. Run frontend: `cd frontend && npm start`
4. Access the application at `http://localhost:3000`

## Default Ports

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432
