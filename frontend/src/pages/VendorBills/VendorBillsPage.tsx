import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateVendorBillModal from './CreateVendorBillModal';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

interface VendorBill {
  id: number;
  bill_number: string;
  vendor_name: string;
  project_name: string;
  po_number: string;
  bill_date: string;
  due_date: string;
  status: string;
  grand_total: number;
  created_by_name: string;
}

const VendorBillsPage: React.FC = () => {
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchVendorBills();
  }, []);

  const fetchVendorBills = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/vendor-bills', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendorBills(response.data);
    } catch (error) {
      console.error('Error fetching vendor bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostBill = async (billId: number) => {
    if (!window.confirm('Are you sure you want to post this vendor bill? It cannot be edited after posting.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/vendor-bills/post/${billId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVendorBills();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to post vendor bill');
    }
  };

  const handleMarkPaid = async (billId: number) => {
    if (!window.confirm('Are you sure you want to mark this vendor bill as paid? This will update project costs.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/vendor-bills/mark-paid/${billId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVendorBills();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark vendor bill as paid');
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
    <RoleProtectedRoute allowedRoles={['admin', 'project_manager']}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Vendor Bills</h1>
            <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Manage vendor bills and track project costs</p>
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
            + Create Vendor Bill
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Bill #</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Vendor</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Project</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>PO #</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Due Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Amount</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorBills.map((bill) => (
                  <tr key={bill.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                      {bill.bill_number}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {bill.vendor_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {bill.project_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {bill.po_number || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {new Date(bill.due_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(bill.status)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      ${Number(bill.grand_total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {bill.status === 'draft' && (
                          <button
                            onClick={() => handlePostBill(bill.id)}
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
                        {bill.status === 'posted' && (
                          <button
                            onClick={() => handleMarkPaid(bill.id)}
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
          
          {vendorBills.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>No Vendor Bills</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Create your first vendor bill to get started</p>
            </div>
          )}
        </div>

        <CreateVendorBillModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onBillCreated={fetchVendorBills}
        />
      </div>
    </RoleProtectedRoute>
  );
};

export default VendorBillsPage;