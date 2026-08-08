import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Banner, Button, EmptyState, GlassCard, Skeleton } from './ui/Glass';

/**
 * "Where you're logged in" — every active session, with per-device sign-out.
 *
 * The account settings page most projects never build, and the reason the
 * token layer carries a `jti`: without one, the only revocation available is
 * `tokenVersion`, which signs out every device at once.
 */

const relativeTime = (value) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 90) return 'just now';

  const units = [
    ['minute', 60],
    ['hour', 60],
    ['day', 24],
    ['month', 30],
  ];

  let amount = seconds / 60;
  let label = 'minute';
  for (let i = 0; i < units.length - 1 && amount >= units[i + 1][1]; i += 1) {
    amount /= units[i + 1][1];
    label = units[i + 1][0];
  }

  const rounded = Math.round(amount);
  return `${rounded} ${label}${rounded === 1 ? '' : 's'} ago`;
};

/**
 * Node reports loopback as the IPv6 `::1`, and an IPv4 client arriving over a
 * dual-stack socket comes through as `::ffff:203.0.113.5`. Neither is
 * something to show a person hunting for a device they don't recognise.
 */
const formatIp = (ip) => {
  if (!ip) return 'Unknown IP';
  if (ip === '::1' || ip === '127.0.0.1') return 'This network';
  return ip.replace(/^::ffff:/, '');
};

const deviceIcon = (device = '') => {
  if (/iOS|Android/i.test(device)) return '📱';
  if (/macOS|Windows|Linux/i.test(device)) return '💻';
  return '🖥️';
};

export default function Sessions() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Tracks which row is mid-request so only that button shows a spinner.
  const [busy, setBusy] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/sessions');
      setSessions(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revokeOne = async (session) => {
    setBusy(session.id);
    setNotice('');
    try {
      await api.delete(`/auth/sessions/${session.id}`);

      if (session.current) {
        // Signing out the device you are holding is a logout. Clear the local
        // auth state too, or the app keeps rendering as though signed in until
        // the next request happens to 401.
        await logout();
        navigate('/');
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setNotice(`Signed out ${session.device}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = async () => {
    setBusy('others');
    setNotice('');
    try {
      const { data } = await api.delete('/auth/sessions');
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const otherCount = (sessions ?? []).filter((s) => !s.current).length;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <header className="mb-5">
        <h1 className="text-2xl font-bold gl-gradient-text">Where you&apos;re logged in</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Every device with an active Chattrix session. Sign out anything you don&apos;t recognise.
        </p>
      </header>

      <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>
      <Banner tone="success" onDismiss={() => setNotice('')}>{notice}</Banner>

      {sessions === null && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} style={{ height: '5.5rem', borderRadius: '1rem' }} />
          ))}
        </div>
      )}

      {sessions?.length === 0 && (
        <EmptyState icon="🔒" title="No active sessions">
          That shouldn&apos;t be possible while you&apos;re reading this — try reloading.
        </EmptyState>
      )}

      <div className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <GlassCard key={s.id} className="flex items-center gap-4 p-4" hover>
            <span className="text-2xl" aria-hidden="true">{deviceIcon(s.device)}</span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{s.device}</span>
                {s.current && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'rgba(16,185,129,0.16)',
                      border: '1px solid rgba(16,185,129,0.35)',
                      color: '#6ee7b7',
                    }}
                  >
                    This device
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatIp(s.ip)} · active {relativeTime(s.lastSeenAt)}
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              loading={busy === s.id}
              onClick={() => revokeOne(s)}
            >
              {s.current ? 'Sign out' : 'Revoke'}
            </Button>
          </GlassCard>
        ))}
      </div>

      {otherCount > 0 && (
        <div className="mt-5 flex justify-end">
          <Button variant="danger" loading={busy === 'others'} onClick={revokeOthers}>
            Sign out all other devices ({otherCount})
          </Button>
        </div>
      )}
    </div>
  );
}
