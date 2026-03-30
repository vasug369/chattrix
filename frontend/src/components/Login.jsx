import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = 'https://chattrix-2.onrender.com';

function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, { name, email, password });
      setMode('signin');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, { email, password }, { withCredentials: true });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mode === 'signin' ? handleLogin() : handleRegister();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0f1b3d 60%, #0a0a1a 100%)' }}>

      {/* Animated background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animation: 'pulseGlow 6s ease-in-out infinite' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animation: 'pulseGlow 8s ease-in-out infinite 2s' }} />

      {/* Main card */}
      <div className="glass-strong w-full max-w-[460px] p-10 sm:p-12 animate-fade-in-up relative z-10">

        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{ background: 'var(--accent-gradient)' }}>
            <span className="text-4xl">💬</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-poppins">
            Chattrix
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center animate-fade-in"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 stagger-children">

          {mode === 'signup' && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                Full Name
              </label>
              <input
                id="input-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                }}
                onFocus={(e) => {
                  e.target.style.background = 'var(--bg-input-focus)';
                  e.target.style.borderColor = 'var(--border-glow)';
                  e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--bg-input)';
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          )}

          <div className="animate-fade-in-up">
            <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <input
              id="input-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
              }}
              onFocus={(e) => {
                e.target.style.background = 'var(--bg-input-focus)';
                e.target.style.borderColor = 'var(--border-glow)';
                e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'var(--bg-input)';
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="animate-fade-in-up">
            <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              id="input-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
              }}
              onFocus={(e) => {
                e.target.style.background = 'var(--bg-input-focus)';
                e.target.style.borderColor = 'var(--border-glow)';
                e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'var(--bg-input)';
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {mode === 'signup' && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                Confirm Password
              </label>
              <input
                id="input-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                }}
                onFocus={(e) => {
                  e.target.style.background = 'var(--bg-input-focus)';
                  e.target.style.borderColor = 'var(--border-glow)';
                  e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--bg-input)';
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          )}

          {/* Submit button */}
          <button
            id="btn-submit"
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-semibold text-sm tracking-wide cursor-pointer transition-all duration-300 mt-4"
            style={{
              background: 'var(--accent-gradient)',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 30px var(--accent-glow)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
        </div>

        {/* Mode toggle */}
        <button
          id="btn-toggle-mode"
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
          }}
          className="w-full h-12 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'var(--border-glow)';
            e.target.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.color = 'var(--text-secondary)';
          }}
        >
          {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}

export default Login;
