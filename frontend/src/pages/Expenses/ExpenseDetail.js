import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar/Sidebar';
import ProfileDropdown from '../../components/ProfileDropdown/ProfileDropdown';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpense(response.data);
    } catch (error) {
      console.error('Error fetching expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/expenses/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExpense();
    } catch (error) {
      console.error(`Error ${action} expense:`, error);
      alert(error.response?.data?.message || `Failed to ${action} expense`);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reimbursed: 'bg-purple-100 text-purple-800'
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`;
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (!expense) return <div style={{ padding: '24px' }}>Expense not found</div>;

  return (
    <div style={{ display: 'flex', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar activeSection="expenses" onSectionChange={() => {}} />
      
      <div style={{ marginLeft: '256px', flex: 1 }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{expense.expense_number}</h1>
            <span className={getStatusBadge(expense.status)}>{expense.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {expense.status === 'draft' && (
              <>
                <Link
                  to={`/expenses/${id}/edit`}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#64748b',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleStatusChange('submit')}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Submit
                </button>
              </>
            )}
            {expense.status === 'submitted' && (
              <>
                <button
                  onClick={() => handleStatusChange('approve')}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange('reject')}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Reject
                </button>
              </>
            )}
            {expense.status === 'approved' && (
              <button
                onClick={() => handleStatusChange('reimburse')}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#9333ea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Reimburse
              </button>
            )}
            <ProfileDropdown />
          </div>
        </div>
        
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '8px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Expense Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{new Date(expense.expense_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.category}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
                    {expense.currency} {Number(expense.amount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.description}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billable</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.billable ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '8px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Project Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.project_name}</p>
                </div>
                {expense.task_name && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task</label>
                    <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.task_name}</p>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created By</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{expense.submitted_by_name}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created At</label>
                  <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontSize: '14px' }}>{new Date(expense.created_at).toLocaleString()}</p>
                </div>

                {expense.receipt_url && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receipt</label>
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href={`http://localhost:5000${expense.receipt_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'rgb(160, 80, 140)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        📎 View Receipt
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {expense.status === 'rejected' && expense.rejection_reason && (
            <div style={{ 
              marginTop: '24px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <h3 style={{ color: '#991b1b', fontWeight: '500', margin: '0 0 8px 0' }}>Rejection Reason</h3>
              <p style={{ color: '#7f1d1d', margin: 0 }}>{expense.rejection_reason}</p>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => navigate('/expenses')}
              style={{
                padding: '12px 20px',
                backgroundColor: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
            >
              Back to Expenses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;