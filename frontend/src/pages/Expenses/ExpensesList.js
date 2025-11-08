import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ExpensesList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchExpenses();
  }, [filter]);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('http://localhost:5000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/expenses/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExpenses();
    } catch (error) {
      console.error(`Error ${action} expense:`, error);
      alert(error.response?.data?.message || `Failed to ${action} expense`);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reimbursed: 'bg-purple-100 text-purple-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`;
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link
          to="/expenses/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Expense
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Expenses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reimbursed">Reimbursed</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/expenses/${expense.id}`} className="text-blue-600 hover:underline">
                    {expense.expense_number}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{expense.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {expense.currency} {Number(expense.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(expense.status)}>{expense.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {expense.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(expense.id, 'submit')}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      Submit
                    </button>
                  )}
                  {expense.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(expense.id, 'approve')}
                        className="text-green-600 hover:underline mr-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(expense.id, 'reject')}
                        className="text-red-600 hover:underline mr-2"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {expense.status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(expense.id, 'reimburse')}
                      className="text-purple-600 hover:underline mr-2"
                    >
                      Reimburse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpensesList;