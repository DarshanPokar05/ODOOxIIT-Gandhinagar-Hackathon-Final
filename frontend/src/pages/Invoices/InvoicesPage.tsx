import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateInvoiceModal from './CreateInvoiceModal';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  project_name: string;
  invoice_date: string;
  due_date: string;
  status: string;
  grand_total: number;
  created_by_name: string;
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostInvoice = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to post this invoice? It cannot be edited after posting.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/invoices/post/${invoiceId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInvoices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to post invoice');
    }
  };

  const handleMarkPaid = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to mark this invoice as paid?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/invoices/mark-paid/${invoiceId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInvoices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark invoice as paid');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: { bg: '#fef3c7', color: '#92400e' },
      posted: { bg: '#dbeafe', color: '#1e40af' },
      paid: { bg: '#d1fae5', color: '#065f46' },
      cancelled: { bg: '#fecaca', color: '#dc2626' }
    };
    const statusColor = colors[status as keyof typeof colors] || colors.draft;
    
    return (
      <span style={{
        backgroundColor: statusColor.bg,
        color: statusColor.color,
        padding: '4px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '500',
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <RoleProtectedRoute allowedRoles={['admin', 'finance_manager']}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Customer Invoices</h1>
            <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Manage customer invoices and track payments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
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
            + Create Invoice
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Invoice #</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Customer</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Project</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Due Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Amount</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                      {invoice.invoice_number}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {invoice.customer_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {invoice.project_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      ${Number(invoice.grand_total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handlePostInvoice(invoice.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Post
                          </button>
                        )}
                        {invoice.status === 'posted' && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {invoices.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>No Invoices</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Create your first invoice to get started</p>
            </div>
          )}
        </div>

        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onInvoiceCreated={fetchInvoices}
        />
      </div>
    </RoleProtectedRoute>
  );
};

export default InvoicesPage;