import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface UserManagementProps {
  onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'team_member',
    password: '',
    status: 'active'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (search?: string) => {
    try {
      const token = localStorage.getItem('token');
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await axios.get(`http://localhost:5000/api/users${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchTerm);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/users', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowAddForm(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'team_member',
        password: '',
        status: 'active'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert(error.response?.data?.message || 'Error adding user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };
      
      await axios.put(`http://localhost:5000/api/users/${editingUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'team_member',
        password: '',
        status: 'active'
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Error updating user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      password: '',
      status: user.status
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'project_manager': return '#2563eb';
      case 'finance': return '#059669';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#10b981' : '#ef4444';
  };

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
        width: '95%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>User Management</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ➕ Add User
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔍
            </button>
          </form>
        </div>

        {/* User Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 30px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      {user.first_name} {user.last_name}
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: `${getRoleColor(user.role)}20`,
                        color: getRoleColor(user.role),
                        textTransform: 'capitalize'
                      }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: `${getStatusColor(user.status)}20`,
                        color: getStatusColor(user.status),
                        textTransform: 'capitalize'
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditForm(user)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#dc2626'
                          }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit User Form */}
        {(showAddForm || editingUser) && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '500px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ margin: '0 0 20px 0' }}>
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              
              <form onSubmit={editingUser ? handleEditUser : handleAddUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <option value="team_member">Team Member</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {editingUser && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {!editingUser && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingUser(null);
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        role: 'team_member',
                        password: '',
                        status: 'active'
                      });
                    }}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    💾 {editingUser ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;