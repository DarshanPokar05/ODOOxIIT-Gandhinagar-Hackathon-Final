import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

interface Customer {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sales_price: number;
  sales_tax_percent: number;
}

interface OrderLine {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_percent: number;
  line_total: number;
  tax_amount: number;
  line_grand_total: number;
}

const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [customersRes, projectsRes, productsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/sales-orders/data/customers', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/sales-orders/data/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/sales-orders/data/products', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setCustomers(customersRes.data);
      setProjects(projectsRes.data);
      setProducts(productsRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Only admin and finance manager can access sales orders.');
      }
    }
  };

  const addLine = () => {
    setLines([...lines, {
      product_id: 0,
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      tax_percent: 0,
      line_total: 0,
      tax_amount: 0,
      line_grand_total: 0
    }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };

    // Auto-populate price and tax when product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updatedLines[index].unit_price = Number(product.sales_price) || 0;
        updatedLines[index].tax_percent = Number(product.sales_tax_percent) || 0;
        updatedLines[index].product_name = product.name;
      }
    }

    // Recalculate totals
    const line = updatedLines[index];
    line.line_total = line.quantity * line.unit_price;
    line.tax_amount = line.line_total * (line.tax_percent / 100);
    line.line_grand_total = line.line_total + line.tax_amount;

    setLines(updatedLines);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const totalTax = lines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.project_id || lines.length === 0) {
      alert('Please fill all required fields and add at least one line item');
      return;
    }

    // Validate lines
    for (const line of lines) {
      if (!line.product_id || line.quantity <= 0 || line.unit_price <= 0 || line.tax_percent < 0) {
        alert('Please check all line items for valid data');
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/sales-orders', {
        ...formData,
        lines
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onOrderCreated();
      onClose();
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      project_id: '',
      order_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setLines([]);
  };

  const { subtotal, totalTax, grandTotal } = calculateTotals();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '0',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px 24px 0 24px', 
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>Create Sales Order</h2>
            <button 
              onClick={onClose} 
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                borderRadius: '4px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px 24px' }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                Customer *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                Project *
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
              Order Date
            </label>
            <input
              type="date"
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              style={{
                width: '200px',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Order Lines */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Order Lines</h3>
              <button
                type="button"
                onClick={addLine}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                + Add Line
              </button>
            </div>

            {lines.map((line, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', 
                gap: '12px', 
                alignItems: 'end',
                marginBottom: '12px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Product</label>
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(index, 'product_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Qty</label>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Unit</label>
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateLine(index, 'unit', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Price</label>
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Tax %</label>
                  <input
                    type="number"
                    value={line.tax_percent}
                    onChange={(e) => updateLine(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  style={{
                    padding: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Subtotal:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Total Tax:</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>${totalTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Grand Total:</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'rgb(160, 80, 140)' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '14px' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#64748b'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSalesOrderModal;