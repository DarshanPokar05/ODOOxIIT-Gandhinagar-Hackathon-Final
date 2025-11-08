import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post('http://localhost:5000/api/auth/verify-otp', { email, otp });
      setMessage('Email verified successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 auto 16px'
          }}>
            📧
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b',
            margin: '0 0 8px 0'
          }}>
            Verify Your Email
          </h1>
          <p style={{ 
            color: '#64748b', 
            fontSize: '16px',
            margin: '0 0 8px 0'
          }}>
            We've sent a 6-digit code to
          </p>
          <p style={{ 
            color: 'rgb(160, 80, 140)', 
            fontSize: '16px',
            fontWeight: '500',
            margin: 0
          }}>
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500', 
              color: '#374151',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Enter Verification Code
            </label>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                fontWeight: '600',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgb(160, 80, 140)'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgb(160, 80, 140) 0%, rgb(140, 60, 120) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
              opacity: (loading || otp.length !== 6) ? 0.7 : 1,
              transition: 'all 0.2s ease',
              marginBottom: '24px'
            }}
            onMouseEnter={(e) => {
              if (!loading && otp.length === 6) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          {message && (
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: message.includes('successfully') ? '#d1fae5' : '#fee2e2',
              color: message.includes('successfully') ? '#065f46' : '#991b1b',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              Didn't receive the code?{' '}
            </span>
            <button 
              type="button"
              onClick={() => window.location.reload()} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'rgb(160, 80, 140)', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'underline'
              }}
            >
              Resend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
