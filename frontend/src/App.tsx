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
import FinanceManagerDashboard from './pages/FinanceManagerDashboard';
import Unauthorized from './pages/Unauthorized';
import PurchaseOrdersPage from './pages/PurchaseOrders/PurchaseOrdersPage';
import ExpensesPage from './pages/Expenses/ExpensesPage';
import ExpenseFormComplete from './pages/Expenses/ExpenseFormComplete';
import ExpenseDetail from './pages/Expenses/ExpenseDetail';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  
  const getDashboardRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/dashboard/admin';
      case 'project_manager': return '/dashboard/project-manager';
      case 'finance_manager': return '/dashboard/finance-manager';
      default: return '/dashboard/team-member';
    }
  };

  return (
    <Routes>
      <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to={getDashboardRoute()} />} />
      <Route path="/verify-otp" element={!isAuthenticated ? <VerifyOTP /> : <Navigate to="/login" />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDashboardRoute()} />} />
      
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
      
      <Route path="/dashboard/finance-manager" element={
        <ProtectedRoute allowedRoles={['finance_manager', 'admin']}>
          <FinanceManagerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/purchase-orders" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager']}>
          <PurchaseOrdersPage />
        </ProtectedRoute>
      } />
      
      <Route path="/expenses" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager', 'team_member']}>
          <ExpensesPage />
        </ProtectedRoute>
      } />
      
      <Route path="/expenses/new" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager', 'team_member']}>
          <ExpenseFormComplete />
        </ProtectedRoute>
      } />
      
      <Route path="/expenses/:id" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager', 'team_member']}>
          <ExpenseDetail />
        </ProtectedRoute>
      } />
      
      <Route path="/expenses/:id/edit" element={
        <ProtectedRoute allowedRoles={['admin', 'project_manager', 'team_member']}>
          <ExpenseFormComplete />
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? getDashboardRoute() : "/login"} />} />
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