import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ProfileModal.css';

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>My Profile</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-content">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          {!isChangingPassword ? (
            <div className="profile-section">
              <div className="profile-picture-section">
                <div className="profile-picture">
                  {profile?.profile_picture ? (
                    <img 
                      src={`http://localhost:5000/${profile.profile_picture}`} 
                      alt="Profile" 
                    />
                  ) : (
                    <div className="default-avatar">
                      {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || 'N'}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="edit-form">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="save-btn">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info">
                  <div className="info-item">
                    <label>Full Name</label>
                    <span>{profile?.first_name || 'Not set'} {profile?.last_name || ''}</span>
                  </div>
                  <div className="info-item">
                    <label>Email Address</label>
                    <span>{profile?.email || 'Not available'}</span>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <span className="role-badge">{profile?.role?.replace('_', ' ') || 'Not assigned'}</span>
                  </div>
                  <div className="info-item">
                    <label>Member Since</label>
                    <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Not available'}</span>
                  </div>
                  <div className="profile-actions">
                    <button onClick={() => setIsEditing(true)} className="edit-btn">
                      Edit Profile
                    </button>
                    <button onClick={() => setIsChangingPassword(true)} className="change-password-btn">
                      Change Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="password-change-section">
              <h3>Change Password</h3>
              
              {!otpSent ? (
                <div className="otp-request">
                  <p>To change your password, we'll send an OTP to your registered email address.</p>
                  <button 
                    onClick={handleRequestPasswordChange} 
                    disabled={loading}
                    className="request-otp-btn"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                  <button 
                    onClick={() => setIsChangingPassword(false)} 
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="password-form">
                  <div className="form-group">
                    <label>Enter OTP</label>
                    <input
                      type="text"
                      value={passwordData.otp}
                      onChange={(e) => setPasswordData({ ...passwordData, otp: e.target.value })}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="save-btn">
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsChangingPassword(false);
                        setOtpSent(false);
                        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
                      }} 
                      className="cancel-btn"
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