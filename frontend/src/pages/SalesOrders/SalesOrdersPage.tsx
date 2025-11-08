import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateSalesOrderModal from './CreateSalesOrderModal';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

interface SalesOrder {
  id: number;
  order_number: string;
  customer_name: string;
  project_name: string;
  order_date: string;
  status: string;
  grand_total: number;
  created_by_name: string;
}

const SalesOrdersPage: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    fetchSalesOrders();
  }, [selectedProjectId]);

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = selectedProjectId ? `?project_id=${selectedProjectId}` : '';
      const response = await axios.get(`http://localhost:5000/api/sales-orders${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalesOrders(response.data);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to confirm this sales order? It cannot be edited after confirmation.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/sales-orders/confirm/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSalesOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to confirm sales order');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: { bg: '#fef3c7', color: '#92400e' },
      confirmed: { bg: '#d1fae5', color: '#065f46' }
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Sales Orders</h1>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Manage customer sales orders and generate invoices</p>
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
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          + Create Sales Order
        </button>
      </div>

      {/* Sales Orders Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Order Number</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Customer</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Project</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Date</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Total</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.map((order) => (
                <tr key={order.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                    {order.order_number}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                    {order.customer_name}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                    {order.project_name}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getStatusBadge(order.status)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    ${Number(order.grand_total || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {order.status === 'draft' && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
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
                          Confirm
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgb(160, 80, 140)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Create Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {salesOrders.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>No Sales Orders</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Create your first sales order to get started</p>
          </div>
        )}
      </div>

      <CreateSalesOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={fetchSalesOrders}
      />
    </div>
    </RoleProtectedRoute>
  );
};

export default SalesOrdersPage;