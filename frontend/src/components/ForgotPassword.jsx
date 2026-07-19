import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0f1b3d 60%, #0a0a1a 100%)' }}>
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animation: 'pulseGlow 6s ease-in-out infinite' }} />
      <div className="glass-strong w-full max-w-[440px] p-10 sm:p-12 animate-fade-in-up relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'var(--accent-gradient)' }}>
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-poppins">{title}</h1>
          {subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border-color)' };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/send-reset-otp', { email });
      setMessage(res.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/reset-password', { email, otp, newPassword });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === 'request' ? 'Reset your password' : 'Enter reset code'}
      subtitle={step === 'request' ? "We'll email you a one-time code" : `Code sent to ${email}`}
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {error}
        </div>
      )}
      {message && step === 'reset' && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          {message}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={requestOtp} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none"
            style={inputStyle}
          />
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm cursor-pointer" style={{ background: 'var(--accent-gradient)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none tracking-widest text-center"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none"
            style={inputStyle}
          />
          <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm cursor-pointer" style={{ background: 'var(--accent-gradient)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="w-full h-11 mt-6 rounded-xl text-sm font-medium cursor-pointer"
        style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
      >
        Back to sign in
      </button>
    </AuthShell>
  );
}
