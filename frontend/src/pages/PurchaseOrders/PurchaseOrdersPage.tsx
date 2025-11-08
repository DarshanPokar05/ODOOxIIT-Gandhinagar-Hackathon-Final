import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_name: string;
  project_name: string;
  order_date: string;
  status: string;
  grand_total: number;
  created_by_name: string;
}

const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to confirm this purchase order? It cannot be edited after confirmation.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/purchase-orders/confirm/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPurchaseOrders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to confirm purchase order');
    }
  };

  const handleCreateVendorBill = async (orderId: number) => {
    if (!window.confirm('Create vendor bill from this purchase order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/vendor-bills/from-po/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Vendor bill created successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create vendor bill');
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
    <RoleProtectedRoute allowedRoles={['admin', 'project_manager']}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Purchase Orders</h1>
            <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Manage vendor purchase orders and track project costs</p>
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
            + Create Purchase Order
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>PO Number</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Vendor</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Project</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Total</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((order) => (
                  <tr key={order.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                      {order.po_number}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                      {order.vendor_name}
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
                            onClick={() => handleCreateVendorBill(order.id)}
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
                            Create Vendor Bill
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {purchaseOrders.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>No Purchase Orders</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Create your first purchase order to get started</p>
            </div>
          )}
        </div>

        <CreatePurchaseOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onOrderCreated={fetchPurchaseOrders}
        />
      </div>
    </RoleProtectedRoute>
  );
};

export default PurchaseOrdersPage;