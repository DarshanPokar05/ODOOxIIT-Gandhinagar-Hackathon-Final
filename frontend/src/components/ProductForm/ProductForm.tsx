import React, { useState, useEffect } from 'react';

interface Product {
  id?: number;
  name: string;
  type_sales: boolean;
  type_purchase: boolean;
  type_expenses: boolean;
  sales_price?: number;
  sales_tax_percent?: number;
  cost_price?: number;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onProductSaved: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, product, onProductSaved }) => {
  const [formData, setFormData] = useState<Product>({
    name: '',
    type_sales: false,
    type_purchase: false,
    type_expenses: false,
    sales_price: undefined,
    sales_tax_percent: undefined,
    cost_price: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        type_sales: false,
        type_purchase: false,
        type_expenses: false,
        sales_price: undefined,
        sales_tax_percent: undefined,
        cost_price: undefined
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.type_sales && !formData.type_purchase && !formData.type_expenses) {
      setError('At least one product type must be selected');
      setLoading(false);
      return;
    }

    if (formData.type_sales && (!formData.sales_price || formData.sales_tax_percent === undefined)) {
      setError('Sales price and tax percent are required for sales products');
      setLoading(false);
      return;
    }

    if ((formData.type_purchase || formData.type_expenses) && !formData.cost_price) {
      setError('Cost price is required for purchase/expense products');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = product ? `http://localhost:5000/api/products/${product.id}` : 'http://localhost:5000/api/products';
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onProductSaved();
        onClose();
      } else {
        setError(data.message || 'Failed to save product');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxPreview = () => {
    if (formData.sales_price && formData.sales_tax_percent) {
      const salesPrice = Number(formData.sales_price);
      const taxPercent = Number(formData.sales_tax_percent);
      const taxAmount = salesPrice * (taxPercent / 100);
      const grossPrice = salesPrice + taxAmount;
      return { taxAmount: Number(taxAmount), grossPrice: Number(grossPrice) };
    }
    return null;
  };

  const taxPreview = calculateTaxPreview();

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
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '0',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ 
          padding: '24px 24px 0 24px', 
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
              {product ? 'Edit Product' : 'Create Product'}
            </h2>
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
          {error && (
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          {/* Product Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500', 
              color: '#374151',
              fontSize: '14px'
            }}>
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter product name"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Product Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '500', 
              color: '#374151',
              fontSize: '14px'
            }}>
              Product Type *
            </label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { key: 'type_sales', label: 'Sales' },
                { key: 'type_purchase', label: 'Purchase' },
                { key: 'type_expenses', label: 'Expenses' }
              ].map(type => (
                <label key={type.key} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: formData[type.key as keyof Product] ? '#f3f4f6' : 'white',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={formData[type.key as keyof Product] as boolean}
                    onChange={(e) => setFormData({ ...formData, [type.key]: e.target.checked })}
                    style={{ accentColor: 'rgb(160, 80, 140)' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sales Fields */}
          {formData.type_sales && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    Sales Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sales_price || ''}
                    onChange={(e) => setFormData({ ...formData, sales_price: parseFloat(e.target.value) || undefined })}
                    required
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500', 
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    Sales Tax (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.sales_tax_percent || ''}
                    onChange={(e) => setFormData({ ...formData, sales_tax_percent: parseFloat(e.target.value) || undefined })}
                    required
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              {taxPreview && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Tax Amount:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      ${taxPreview.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Gross Price:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgb(160, 80, 140)' }}>
                      ${taxPreview.grossPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cost Price */}
          {(formData.type_purchase || formData.type_expenses) && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#374151',
                fontSize: '14px'
              }}>
                Cost Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price || ''}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || undefined })}
                required
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          )}

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
                color: '#64748b',
                transition: 'all 0.2s ease'
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
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
