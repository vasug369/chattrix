import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass-strong p-10 text-center animate-fade-in-up max-w-md">
        <p className="text-5xl mb-4">🧭</p>
        <h1 className="text-2xl font-bold font-poppins mb-2" style={{ color: 'var(--text-primary)' }}>Page not found</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 h-11 rounded-xl text-white font-semibold text-sm cursor-pointer"
          style={{ background: 'var(--accent-gradient)' }}
        >
          Back to Chattrix
        </button>
      </div>
    </div>
  );
}
