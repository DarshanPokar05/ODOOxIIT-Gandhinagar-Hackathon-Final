import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar/Sidebar';
import ProfileDropdown from '../../components/ProfileDropdown/ProfileDropdown';

interface Expense {
  id: number;
  expense_number: string;
  expense_date: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  billable: boolean;
  project_name: string;
  task_name?: string;
  submitted_by_name: string;
  customer_name?: string;
  receipt_url?: string;
  receipt_required: boolean;
}

const ExpensesPageComplete: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    project_id: '',
    billable: 'all',
    start_date: '',
    end_date: ''
  });
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`http://localhost:5000/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleStatusChange = async (id: number, action: string, reason?: string) => {
    try {
      const token = localStorage.getItem('token');
      const payload = reason ? { reason } : {};
      
      await axios.post(`http://localhost:5000/api/expenses/${id}/${action}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchExpenses();
    } catch (error: any) {
      console.error(`Error ${action} expense:`, error);
      alert(error.response?.data?.message || `Failed to ${action} expense`);
    }
  };

  const handleReject = (id: number) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      handleStatusChange(id, 'reject', reason);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reimbursed: 'bg-purple-100 text-purple-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`;
  };

  const canPerformAction = (expense: Expense, action: string) => {
    const isOwner = expense.submitted_by_name === `${user?.firstName} ${user?.lastName}`;
    const isManager = ['project_manager', 'admin'].includes(user?.role || '');
    const isAdmin = user?.role === 'admin';

    switch (action) {
      case 'submit':
        return expense.status === 'draft' && isOwner;
      case 'approve':
        return expense.status === 'submitted' && isManager;
      case 'reject':
        return expense.status === 'submitted' && isManager;
      case 'reimburse':
        return expense.status === 'approved' && isAdmin;
      case 'edit':
        return expense.status === 'draft' && (isOwner || isManager);
      default:
        return false;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-6">Loading expenses...</div>;

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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>Expenses</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Manage project expenses and reimbursements</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              to="/expenses/new"
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(160, 80, 140, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span>
              New Expense
            </Link>
            <ProfileDropdown />
          </div>
        </div>
        
        <div style={{ padding: '32px' }}>


      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', backgroundColor: 'white', color: '#1e293b' }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reimbursed">Reimbursed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</label>
            <select
              value={filters.project_id}
              onChange={(e) => handleFilterChange('project_id', e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', backgroundColor: 'white', color: '#1e293b' }}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billable</label>
            <select
              value={filters.billable}
              onChange={(e) => handleFilterChange('billable', e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', backgroundColor: 'white', color: '#1e293b' }}
            >
              <option value="all">All</option>
              <option value="true">Billable</option>
              <option value="false">Non-Billable</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', backgroundColor: 'white', color: '#1e293b' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', backgroundColor: 'white', color: '#1e293b' }}
            />
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Expense Details
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Project/Task
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Amount
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Submitted By
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'white' }}>
            {expenses.map((expense) => (
              <tr key={expense.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                  <div>
                    <Link 
                      to={`/expenses/${expense.id}`} 
                      style={{ color: 'rgb(160, 80, 140)', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {expense.expense_number}
                    </Link>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      {new Date(expense.expense_date).toLocaleDateString()} • {expense.category}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      {expense.billable && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#166534' }}>
                          Billable
                        </span>
                      )}
                      {expense.receipt_url && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                          📎 Receipt
                        </span>
                      )}
                      {expense.receipt_required && !expense.receipt_url && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#fecaca', color: '#dc2626' }}>
                          Receipt Required
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{expense.project_name}</div>
                  {expense.task_name && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{expense.task_name}</div>
                  )}
                  {expense.customer_name && (
                    <div style={{ fontSize: '12px', color: 'rgb(160, 80, 140)', marginTop: '2px' }}>→ {expense.customer_name}</div>
                  )}
                </td>
                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    {expense.currency} {Number(expense.amount).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(expense.status)}>
                    {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', fontSize: '14px', color: '#1e293b' }}>
                  {expense.submitted_by_name}
                </td>
                <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: '500' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {canPerformAction(expense, 'edit') && (
                      <Link
                        to={`/expenses/${expense.id}/edit`}
                        style={{ color: 'rgb(160, 80, 140)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Edit
                      </Link>
                    )}
                    {canPerformAction(expense, 'submit') && (
                      <button
                        onClick={() => handleStatusChange(expense.id, 'submit')}
                        style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Submit
                      </button>
                    )}
                    {canPerformAction(expense, 'approve') && (
                      <button
                        onClick={() => handleStatusChange(expense.id, 'approve')}
                        style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Approve
                      </button>
                    )}
                    {canPerformAction(expense, 'reject') && (
                      <button
                        onClick={() => handleReject(expense.id)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Reject
                      </button>
                    )}
                    {canPerformAction(expense, 'reimburse') && (
                      <button
                        onClick={() => handleStatusChange(expense.id, 'reimburse')}
                        style={{ color: '#9333ea', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Reimburse
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {expenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ color: '#64748b' }}>
              <p style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 8px 0' }}>No expenses found</p>
              <p style={{ margin: 0 }}>Create your first expense to get started.</p>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesPageComplete;