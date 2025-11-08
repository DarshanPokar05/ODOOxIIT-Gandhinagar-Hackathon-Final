import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from '../ProfileModal/ProfileModal';

const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgb(160, 80, 140)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {getInitials(user?.firstName, user?.lastName)}
        </div>
        <span style={{ color: '#374151' }}>{user?.firstName} {user?.lastName}</span>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            minWidth: '200px',
            zIndex: 1000
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {user?.email}
            </div>
          </div>
          
          <div style={{ padding: '8px 0' }}>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowProfileModal(true);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>👤</span>
              My Profile
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      )}
      
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default ProfileDropdown;