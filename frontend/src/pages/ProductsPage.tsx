import React, { useState, useEffect } from 'react';
import ProductForm from '../components/ProductForm/ProductForm';
import './ProductsPage.css';

interface Product {
  id: number;
  name: string;
  type_sales: boolean;
  type_purchase: boolean;
  type_expenses: boolean;
  sales_price?: number;
  sales_tax_percent?: number;
  cost_price?: number;
  created_at: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/products?search=${searchTerm}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete product');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const getProductTypes = (product: Product) => {
    const types = [];
    if (product.type_sales) types.push('Sales');
    if (product.type_purchase) types.push('Purchase');
    if (product.type_expenses) types.push('Expenses');
    return types.join(', ');
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="products-page">
      <div className="products-header">
        <h1>Products</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
            className="add-btn"
          >
            + Add Product
          </button>
        </div>
      </div>

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Type</th>
              <th>Sales Price</th>
              <th>Cost Price</th>
              <th>Tax %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>
                  <div className="type-badges">
                    {product.type_sales && <span className="type-badge sales">Sales</span>}
                    {product.type_purchase && <span className="type-badge purchase">Purchase</span>}
                    {product.type_expenses && <span className="type-badge expenses">Expenses</span>}
                  </div>
                </td>
                <td>{product.sales_price ? `$${product.sales_price}` : '-'}</td>
                <td>{product.cost_price ? `$${product.cost_price}` : '-'}</td>
                <td>{product.sales_tax_percent ? `${product.sales_tax_percent}%` : '-'}</td>
                <td>
                  <div className="actions">
                    <button onClick={() => handleEdit(product)} className="edit-btn">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="delete-btn">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="no-products">
            No products found. {searchTerm ? 'Try a different search term.' : 'Create your first product!'}
          </div>
        )}
      </div>

      <ProductForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onProductSaved={fetchProducts}
      />
    </div>
  );
};

export default ProductsPage;