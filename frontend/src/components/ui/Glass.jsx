import { useEffect, useState } from 'react';

/**
 * Shared glassmorphism primitives.
 *
 * These exist so panels, buttons and inputs stay visually consistent — the
 * previous components each inlined their own `style={{ background: ... }}`
 * blobs plus onMouseEnter/onFocus handlers that mutated element styles
 * directly, which meant every page drifted a little from every other.
 */

const cx = (...parts) => parts.filter(Boolean).join(' ');

export function GlassCard({ variant = 'glass', hover = false, ring = false, className = '', children, ...rest }) {
  return (
    <div
      className={cx(variant, hover && 'glass-hover', ring && 'glass-ring', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', size, className = '', loading = false, disabled, children, ...rest }) {
  return (
    <button
      className={cx(
        'gl-btn',
        variant === 'ghost' && 'gl-btn--ghost',
        variant === 'danger' && 'gl-btn--danger',
        size === 'sm' && 'gl-btn--sm',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="gl-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({ label, error, id, className = '', ...rest }) {
  const describedBy = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && (
        <label className="gl-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className="gl-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <p id={describedBy} className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, error, id, className = '', ...rest }) {
  const describedBy = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && (
        <label className="gl-label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="gl-input"
        style={{ resize: 'vertical', minHeight: '7rem' }}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <p id={describedBy} className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Inline status banner. Replaces the `alert()` calls the app used for errors,
 * which blocked the page and could not be styled.
 */
export function Banner({ tone = 'error', children, onDismiss }) {
  if (!children) return null;
  const tones = {
    error: { bg: 'rgba(244,63,94,0.14)', border: 'rgba(244,63,94,0.35)', fg: '#fda4af' },
    success: { bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.35)', fg: '#6ee7b7' },
    info: { bg: 'rgba(139,92,246,0.14)', border: 'rgba(139,92,246,0.35)', fg: '#c4b5fd' },
  };
  const t = tones[tone] ?? tones.error;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm animate-fade-in"
      style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.fg }}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * The User schema's old default `pic`. It points at an iconarchive.com
 * *download page*, not an image — and the host never responds, so the request
 * hangs rather than erroring. onError therefore never fires and the avatar
 * stays permanently blank. Every account created before the schema default was
 * changed still carries this value, so it is filtered out here rather than
 * requiring a data migration.
 */
const LEGACY_PLACEHOLDER_PIC =
  'https://iconarchive.com/download/i107272/Flat-UI-Icons/User-Interface/user.ico';

const usablePic = (src) => (src && src !== LEGACY_PLACEHOLDER_PIC ? src : null);

/** Circular avatar that falls back to the user's initial. */
export function Avatar({ src, name = '?', size = 40, className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.4 };
  const resolved = usablePic(src);

  // Reset when the picture changes, so a new URL gets a fresh attempt.
  useEffect(() => setFailed(false), [src]);

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cx('shrink-0 rounded-full object-cover', className)}
        style={{ ...style, border: '1px solid var(--glass-border)' }}
        {...rest}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ ...style, background: 'var(--accent-gradient)' }}
      {...rest}
    >
      {initial}
    </div>
  );
}

/** Shimmering placeholder used while content loads. */
export function Skeleton({ className = '', style, ...rest }) {
  return <div className={cx('gl-skeleton', className)} style={style} {...rest} />;
}

/** Centred empty-state block. */
export function EmptyState({ icon = '✨', title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 text-5xl opacity-60">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-dim)' }}>
        {title}
      </h3>
      {children && (
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          {children}
        </p>
      )}
    </div>
  );
}
