import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Signup from './pages/Signup';
import VerifyOTP from './pages/VerifyOTP';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ProjectManagerDashboard from './pages/ProjectManagerDashboard';
import TeamMemberDashboard from './pages/TeamMemberDashboard';
import Unauthorized from './pages/Unauthorized';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to={`/dashboard/${user?.role === 'admin' ? 'admin' : user?.role === 'project_manager' ? 'project-manager' : 'team-member'}`} />} />
      <Route path="/verify-otp" element={!isAuthenticated ? <VerifyOTP /> : <Navigate to="/login" />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={`/dashboard/${user?.role === 'admin' ? 'admin' : user?.role === 'project_manager' ? 'project-manager' : 'team-member'}`} />} />
      
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/dashboard/project-manager" element={
        <ProtectedRoute allowedRoles={['project_manager', 'admin']}>
          <ProjectManagerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/dashboard/team-member" element={
        <ProtectedRoute allowedRoles={['team_member', 'project_manager', 'admin']}>
          <TeamMemberDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? `/dashboard/${user?.role === 'admin' ? 'admin' : user?.role === 'project_manager' ? 'project-manager' : 'team-member'}` : "/login"} />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;