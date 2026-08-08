import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { Banner, Button, Field } from './ui/Glass';

const RESEND_COOLDOWN = 60;

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email ?? '');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef(null);

  // Arriving straight from registration, the address is already known — put
  // the cursor where the user actually has to type.
  useEffect(() => {
    if (location.state?.email) otpRef.current?.focus();
  }, [location.state]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      setBanner({ tone: 'success', text: 'Email verified. Redirecting you to sign in…' });
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setBanner({ tone: 'error', text: errorMessage(err, 'Verification failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setBanner(null);
    try {
      await api.post('/auth/send-verify-otp', { email });
      // The server deliberately answers the same way whether or not the
      // address exists, so the wording here must not imply it does.
      setBanner({
        tone: 'info',
        text: 'If that account exists and is unverified, a new code is on its way.',
      });
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setBanner({ tone: 'error', text: errorMessage(err, 'Could not send a new code') });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-[440px] p-8 sm:p-10 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div
            className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: 'var(--accent-gradient)' }}
            aria-hidden="true"
          >
            ✉️
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Verify your email</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
            We sent a 6-digit code to your inbox. It expires in 10 minutes.
          </p>
        </div>

        {banner && (
          <Banner tone={banner.tone} onDismiss={() => setBanner(null)}>
            {banner.text}
          </Banner>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
          <Field
            id="input-verify-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            required
          />

          <div>
            <label className="gl-label" htmlFor="input-otp">
              Verification code
            </label>
            <input
              ref={otpRef}
              id="input-otp"
              className="gl-input text-center"
              style={{ letterSpacing: '0.6em', fontSize: '1.35rem', fontWeight: 600 }}
              type="text"
              inputMode="numeric"
              // Six boxes look nicer but break paste-from-email, which is how
              // most people actually enter these.
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              aria-invalid={errors.otp ? 'true' : undefined}
              required
            />
            {errors.otp && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
                {errors.otp}
              </p>
            )}
          </div>

          <Button type="submit" loading={loading} disabled={otp.length !== 6} className="mt-2 w-full">
            Verify email
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || !email}
            className="cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <Link to="/" className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
