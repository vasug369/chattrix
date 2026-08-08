import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { Banner, Button, Field } from './ui/Glass';

/**
 * Two-step password reset: request a code, then redeem it.
 *
 * Both steps live in one component because the email carries over between
 * them — splitting them across routes meant re-typing the address, or
 * smuggling it through the URL where it lands in browser history.
 */
export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // request | reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async (e) => {
    e?.preventDefault();
    setErrors({});
    setBanner(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('reset');
      setCooldown(60);
      // Deliberately non-committal: the endpoint answers identically for
      // unknown addresses so it cannot be used to enumerate accounts.
      setBanner({
        tone: 'info',
        text: 'If that account exists, a reset code is on its way. Enter it below.',
      });
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setBanner({ tone: 'error', text: errorMessage(err, 'Could not send a reset code') });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);

    if (newPassword !== confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setBanner({ tone: 'success', text: 'Password reset. Redirecting you to sign in…' });
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setBanner({ tone: 'error', text: errorMessage(err, 'Could not reset your password') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-[440px] p-8 sm:p-10 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div
            className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: 'var(--accent-gradient-warm)' }}
            aria-hidden="true"
          >
            🔑
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {step === 'request' ? 'Reset your password' : 'Enter your code'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
            {step === 'request'
              ? "Tell us your email and we'll send a reset code."
              : 'Enter the code from your inbox and choose a new password.'}
          </p>
        </div>

        {banner && (
          <Banner tone={banner.tone} onDismiss={() => setBanner(null)}>
            {banner.text}
          </Banner>
        )}

        {step === 'request' ? (
          <form onSubmit={requestCode} className="flex flex-col gap-4" noValidate>
            <Field
              id="input-reset-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Send reset code
            </Button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="gl-label" htmlFor="input-reset-otp">Reset code</label>
              <input
                id="input-reset-otp"
                className="gl-input text-center"
                style={{ letterSpacing: '0.6em', fontSize: '1.35rem', fontWeight: 600 }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                aria-invalid={errors.otp ? 'true' : undefined}
                required
              />
              {errors.otp && (
                <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{errors.otp}</p>
              )}
            </div>

            <Field
              id="input-new-password"
              label="New password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
              autoComplete="new-password"
              required
            />

            <Field
              id="input-confirm-new-password"
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
              autoComplete="new-password"
              required
            />

            <p className="-mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              At least 8 characters, with an uppercase letter, a lowercase letter and a number.
              Resetting signs you out everywhere.
            </p>

            <Button type="submit" loading={loading} disabled={otp.length !== 6} className="mt-1 w-full">
              Reset password
            </Button>

            <button
              type="button"
              onClick={requestCode}
              disabled={cooldown > 0}
              className="cursor-pointer text-center text-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: 'var(--accent)' }}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
