import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string;
  created_at?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    profilePicture: null as File | null
  });

  const [passwordData, setPasswordData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          profilePicture: null
        });
      } else {
        setError('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Network error occurred');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      
      if (formData.profilePicture) {
        formDataToSend.append('profilePicture', formData.profilePicture);
      }

      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        setIsEditing(false);
        setMessage('Profile updated successfully');
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile/change-password-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setMessage('OTP sent to your email');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otp: passwordData.otp,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password changed successfully');
        setIsChangingPassword(false);
        setOtpSent(false);
        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, profilePicture: e.target.files[0] });
    }
  };

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
        maxWidth: '500px',
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
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>My Profile</h2>
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

        <div style={{ padding: '0 24px 24px 24px' }}>
          {message && (
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              {message}
            </div>
          )}
          
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

          {!isChangingPassword ? (
            <div>
              {/* Profile Picture Section */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  overflow: 'hidden',
                  border: '3px solid #e2e8f0'
                }}>
                  {profile?.profile_picture ? (
                    <img 
                      src={`http://localhost:5000/${profile.profile_picture}`} 
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: '600'
                    }}>
                      {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || 'N'}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
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
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
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
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Full Name</label>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                        {profile?.first_name || 'Not set'} {profile?.last_name || ''}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Email Address</label>
                      <div style={{ fontSize: '16px', color: '#1e293b' }}>
                        {profile?.email || 'Not available'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Role</label>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {profile?.role?.replace('_', ' ') || 'Not assigned'}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Member Since</label>
                      <div style={{ fontSize: '16px', color: '#1e293b' }}>
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 'Not available'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#64748b'
                      }}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
                Change Password
              </h3>
              
              {!otpSent ? (
                <div>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    To change your password, we'll send an OTP to your registered email address.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={handleRequestPasswordChange} 
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                    <button 
                      onClick={() => setIsChangingPassword(false)} 
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={passwordData.otp}
                      onChange={(e) => setPasswordData({ ...passwordData, otp: e.target.value })}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      required
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
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      minLength={6}
                      required
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
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      minLength={6}
                      required
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
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsChangingPassword(false);
                        setOtpSent(false);
                        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
                      }} 
                      style={{
                        flex: 1,
                        padding: '12px 16px',
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
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
