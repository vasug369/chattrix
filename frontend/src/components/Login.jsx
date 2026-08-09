import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Banner, Button, Field } from './ui/Glass';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' };

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, likelySignedIn } = useAuth();

  // Someone who is already signed in has no business on the login screen.
  useEffect(() => {
    if (isAuthenticated) navigate(location.state?.from ?? '/dashboard', { replace: true });
  }, [isAuthenticated, navigate, location.state]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setErrors({});
    setBanner(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await login({ email: form.email, password: form.password });
        navigate(location.state?.from ?? '/dashboard', { replace: true });
      } else {
        await api.post('/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        // Registration issues a verification code; hand the user straight to
        // the screen that consumes it rather than dropping them back at a
        // login form with no explanation.
        navigate('/verify-email', { state: { email: form.email } });
      }
    } catch (err) {
      // Surface per-field messages from the server's Zod errors inline, so the
      // user sees "Password must contain a number" under the password box.
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setBanner({ tone: 'error', text: errorMessage(err, 'Something went wrong') });
    } finally {
      setLoading(false);
    }
  };

  // Only a visitor we have reason to believe is already signed in should wait
  // here. For everyone else — every first-time visitor included — the form
  // needs no answer from /user/me to be useful, and blocking on it meant
  // staring at a spinner for the length of a cold start (~10s on Render's free
  // tier) before a request that was always going to 401 came back.
  //
  // Rendering the form unconditionally instead would flash a login screen at
  // returning users mid-redirect, which reads as "you were signed out".
  if (isLoading && likelySignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="gl-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const isSignup = mode === 'signup';

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-[440px] p-8 sm:p-10 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div
            className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl animate-pulse-glow"
            style={{ background: 'var(--accent-gradient)' }}
            aria-hidden="true"
          >
            💬
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            <span className="gl-gradient-text">Chattrix</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
            {isSignup ? 'Create your account to get started' : 'Welcome back — sign in to continue'}
          </p>
        </div>

        {banner && (
          <Banner tone={banner.tone} onDismiss={() => setBanner(null)}>
            {banner.text}
          </Banner>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 stagger-children" noValidate>
          {isSignup && (
            <Field
              id="input-name"
              label="Full name"
              type="text"
              placeholder="Ada Lovelace"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              autoComplete="name"
              required
              className="animate-fade-in-up"
            />
          )}

          <Field
            id="input-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
            required
            className="animate-fade-in-up"
          />

          <Field
            id="input-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            className="animate-fade-in-up"
          />

          {isSignup && (
            <>
              <Field
                id="input-confirm-password"
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
                autoComplete="new-password"
                required
                className="animate-fade-in-up"
              />
              <p className="-mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                At least 8 characters, with an uppercase letter, a lowercase letter and a number.
              </p>
            </>
          )}

          {!isSignup && (
            <div className="-mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-xs transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                Forgot your password?
              </Link>
            </div>
          )}

          <Button id="btn-submit" type="submit" loading={loading} className="mt-2 w-full">
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
          <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }} />
        </div>

        <Button id="btn-toggle-mode" type="button" variant="ghost" onClick={switchMode} className="w-full">
          {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Button>
      </div>
    </div>
  );
}
