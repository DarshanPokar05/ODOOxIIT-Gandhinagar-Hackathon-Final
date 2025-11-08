import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/Sidebar/Sidebar';
import ProfileDropdown from '../../components/ProfileDropdown/ProfileDropdown';

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  name: string;
}

const ExpenseFormComplete: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    project_id: '',
    task_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    currency: 'USD',
    exchange_rate: '1.0',
    billable: false,
    billable_to_customer_id: '',
    receipt_file: null as File | null
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ['Travel', 'Software', 'Hardware', 'Meals', 'Other'];
  const currencies = ['USD', 'EUR', 'INR'];

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
    if (isEdit) {
      fetchExpense();
    }
  }, [id]);

  useEffect(() => {
    if (formData.project_id) {
      fetchTasks();
    } else {
      setTasks([]);
      setFormData(prev => ({ ...prev, task_id: '' }));
    }
  }, [formData.project_id]);

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

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/tasks?project_id=${formData.project_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/expenses/customers/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchExpense = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const expense = response.data;
      setFormData({
        project_id: expense.project_id?.toString() || '',
        task_id: expense.task_id?.toString() || '',
        expense_date: expense.expense_date.split('T')[0],
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        currency: expense.currency,
        exchange_rate: expense.exchange_rate?.toString() || '1.0',
        billable: expense.billable,
        billable_to_customer_id: expense.billable_to_customer_id?.toString() || '',
        receipt_file: null
      });
    } catch (error) {
      console.error('Error fetching expense:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.expense_date) newErrors.expense_date = 'Date is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (formData.billable && !formData.billable_to_customer_id) {
      newErrors.billable_to_customer_id = 'Customer is required for billable expenses';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, action: 'save' | 'submit' = 'save') => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'receipt_file' && value instanceof File) {
          submitData.append('receipt', value);
        } else if (value !== null && value !== '' && typeof value !== 'boolean') {
          submitData.append(key, value.toString());
        } else if (typeof value === 'boolean') {
          submitData.append(key, value.toString());
        }
      });

      let response;
      if (isEdit) {
        response = await axios.put(`http://localhost:5000/api/expenses/${id}`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await axios.post('http://localhost:5000/api/expenses', submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // If action is submit, submit the expense for approval
      if (action === 'submit' && response.data.id) {
        await axios.post(`http://localhost:5000/api/expenses/${response.data.id}/submit`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      navigate('/expenses');
    } catch (error: any) {
      console.error('Error saving expense:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Failed to save expense' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      setFormData(prev => ({
        ...prev,
        [name]: files ? files[0] : null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{isEdit ? 'Edit Expense' : 'New Expense'}</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              {isEdit ? 'Update expense details' : 'Create a new expense entry with receipt'}
            </p>
          </div>
          <ProfileDropdown />
        </div>
        
        <div style={{ padding: '32px' }}>


      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{errors.general}</p>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <form onSubmit={(e) => handleSubmit(e, 'save')} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Project *
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  border: errors.project_id ? '1px solid #f87171' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  color: '#1e293b',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
                onBlur={(e) => e.target.style.borderColor = errors.project_id ? '#f87171' : '#e2e8f0'}
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              {errors.project_id && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.project_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task (Optional)
              </label>
              <select
                name="task_id"
                value={formData.task_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Task</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>{task.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Date *
              </label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                required
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.expense_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.expense_date && <p className="text-red-500 text-sm mt-1">{errors.expense_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            {formData.currency !== 'USD' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange Rate to USD
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="exchange_rate"
                  value={formData.exchange_rate}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Provide detailed description of the expense..."
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Upload
            </label>
            <input
              type="file"
              name="receipt_file"
              onChange={handleChange}
              accept="image/*,.pdf"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload receipt (JPG, PNG, PDF). Required for expenses over $100.
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                name="billable"
                checked={formData.billable}
                onChange={handleChange}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Billable to client
              </label>
            </div>

            {formData.billable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  name="billable_to_customer_id"
                  value={formData.billable_to_customer_id}
                  onChange={handleChange}
                  required={formData.billable}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.billable_to_customer_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
                {errors.billable_to_customer_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.billable_to_customer_id}</p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              style={{
                padding: '12px 20px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#64748b',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#475569')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#64748b')}
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'submit')}
              disabled={loading}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 2px 4px rgba(160, 80, 140, 0.2)'
              }}
            >
              {loading ? 'Submitting...' : 'Save & Submit'}
            </button>
          </div>
        </form>
      </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormComplete;