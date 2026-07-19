import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/verify-email', { otp });
      await refreshUser();
      showToast('Email verified!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/api/auth/send-verify-otp');
      showToast('Verification code resent to your email', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resend code', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0f1b3d 60%, #0a0a1a 100%)' }}>
      <div className="glass-strong w-full max-w-[440px] p-10 sm:p-12 animate-fade-in-up relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'var(--accent-gradient)' }}>
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-poppins">Verify your email</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            We sent a 6-digit code to {user?.email}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none tracking-widest text-center"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
          />
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm cursor-pointer" style={{ background: 'var(--accent-gradient)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full h-11 mt-4 rounded-xl text-sm font-medium cursor-pointer"
          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          {resending ? 'Resending...' : 'Resend code'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full h-9 mt-3 rounded-xl text-xs cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--text-muted)' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
