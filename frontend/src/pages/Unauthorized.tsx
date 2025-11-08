import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoToDashboard = () => {
    switch (user?.role) {
      case 'admin':
        navigate('/dashboard/admin');
        break;
      case 'project_manager':
        navigate('/dashboard/project-manager');
        break;
      default:
        navigate('/dashboard/team-member');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ color: '#dc3545' }}>Access Denied</h1>
      <p>You don't have permission to access this page.</p>
      <button
        onClick={handleGoToDashboard}
        style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Go to My Dashboard
      </button>
    </div>
  );
};

export default Unauthorized;