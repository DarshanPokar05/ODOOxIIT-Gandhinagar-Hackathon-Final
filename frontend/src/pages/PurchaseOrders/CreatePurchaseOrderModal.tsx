import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Vendor {
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
  cost_price: number;
  type_purchase: boolean;
}

interface OrderLine {
  product_id: number;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_percent: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

const CreatePurchaseOrderModal: React.FC<Props> = ({ isOpen, onClose, onOrderCreated }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    vendor_id: '',
    project_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [lines, setLines] = useState<OrderLine[]>([
    { product_id: 0, quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching data with token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        alert('No authentication token found. Please log in again.');
        return;
      }
      
      const [vendorsRes, projectsRes, productsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/purchase-orders/vendors/list', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/products', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      console.log('Vendors:', vendorsRes.data);
      console.log('Projects:', projectsRes.data);
      console.log('Products:', productsRes.data);
      
      setVendors(vendorsRes.data || []);
      setProjects(projectsRes.data || []);
      const allProducts = productsRes.data || [];
      const purchaseProducts = allProducts.filter((p: Product) => p.type_purchase && p.cost_price > 0);
      console.log('All products:', allProducts);
      console.log('Filtered purchase products:', purchaseProducts);
      
      // If no purchase products found, show all products with cost_price > 0
      const finalProducts = purchaseProducts.length > 0 ? purchaseProducts : allProducts.filter((p: Product) => p.cost_price > 0);
      setProducts(finalProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMsg = (error as any).response?.data?.message || (error as any).message || 'Unknown error';
      alert('Failed to load data: ' + errorMsg);
    } finally {
      setDataLoading(false);
    }
  };

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      product_id: productId,
      unit_price: product?.cost_price || 0
    };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { product_id: 0, quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof OrderLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    
    lines.forEach(line => {
      const lineTotal = line.quantity * line.unit_price;
      const taxAmount = lineTotal * (line.tax_percent / 100);
      subtotal += lineTotal;
      totalTax += taxAmount;
    });
    
    return { subtotal, totalTax, grandTotal: subtotal + totalTax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vendor_id) {
      alert('Please select a vendor');
      return;
    }
    if (!formData.project_id) {
      alert('Please select a project');
      return;
    }
    if (lines.some(l => !l.product_id)) {
      alert('Please select products for all line items');
      return;
    }
    if (lines.some(l => l.quantity <= 0)) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (lines.some(l => l.unit_price <= 0)) {
      alert('Unit price must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        vendor_id: parseInt(formData.vendor_id),
        project_id: parseInt(formData.project_id),
        order_date: formData.order_date,
        notes: formData.notes,
        lines: lines.map(line => ({
          product_id: line.product_id,
          quantity: parseFloat(line.quantity.toString()),
          unit: line.unit,
          unit_price: parseFloat(line.unit_price.toString()),
          tax_percent: parseFloat(line.tax_percent.toString())
        }))
      };
      
      console.log('Sending payload:', payload);
      
      await axios.post('http://localhost:5000/api/purchase-orders', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Purchase order created successfully!');
      onOrderCreated();
      onClose();
      setFormData({ vendor_id: '', project_id: '', order_date: new Date().toISOString().split('T')[0], notes: '' });
      setLines([{ product_id: 0, quantity: 1, unit: 'pcs', unit_price: 0, tax_percent: 0 }]);
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create purchase order';
      alert('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Create Purchase Order</h2>
          <button 
            type="button"
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Vendor *</label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                required
                disabled={dataLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">{dataLoading ? 'Loading...' : 'Select Vendor'}</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Project *</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                required
                disabled={dataLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">{dataLoading ? 'Loading...' : 'Select Project'}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Order Date</label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Order Lines</h3>
              <button
                type="button"
                onClick={addLine}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
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

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Unit</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tax%</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const lineTotal = line.quantity * line.unit_price;
                    const taxAmount = lineTotal * (line.tax_percent / 100);
                    const lineGrandTotal = lineTotal + taxAmount;
                    
                    return (
                      <tr key={index}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          <select
                            value={line.product_id}
                            onChange={(e) => handleProductChange(index, parseInt(e.target.value))}
                            required
                            disabled={dataLoading}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          >
                            <option value={0}>{dataLoading ? 'Loading...' : 'Select Product'}</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>{product.name} (${product.cost_price})</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0.01"
                            step="0.01"
                            required
                            style={{
                              width: '80px',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => updateLine(index, 'unit', e.target.value)}
                            required
                            style={{
                              width: '60px',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            value={line.unit_price}
                            onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0.01"
                            step="0.01"
                            required
                            style={{
                              width: '100px',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            value={line.tax_percent}
                            onChange={(e) => updateLine(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            style={{
                              width: '60px',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: '500' }}>
                          ${lineGrandTotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Total Tax:</span>
              <span>${totalTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
              <span>Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderModal;