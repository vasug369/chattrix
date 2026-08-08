import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { Avatar, Banner, EmptyState, Skeleton } from './ui/Glass';

const ICONS = { like: '❤️', comment: '💬', follow: '👤', message: '✉️' };

const VERBS = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  message: 'sent you a message',
};

const timeAgo = (iso) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationBell() {
  const { unreadNotifications, setUnreadNotifications, latestNotification } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications', { params: { limit: 15 } });
      setItems(data.items);
      setUnreadNotifications(data.unread);
    } catch (err) {
      setError(errorMessage(err, 'Could not load notifications'));
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotifications]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Prepend live arrivals so an open panel stays current without refetching.
  useEffect(() => {
    if (!latestNotification) return;
    setItems((prev) =>
      prev.some((n) => n._id === latestNotification._id)
        ? prev
        : [latestNotification, ...prev].slice(0, 15)
    );
  }, [latestNotification]);

  // Close on outside click and on Escape — a dropdown that traps the user is
  // worse than no dropdown.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadNotifications(0);
    } catch (err) {
      setError(errorMessage(err, 'Could not mark notifications read'));
    }
  };

  const openNotification = async (n) => {
    if (!n.readAt) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setItems((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x))
        );
        setUnreadNotifications((c) => Math.max(0, c - 1));
      } catch {
        // Navigation matters more than the read flag; ignore and continue.
      }
    }

    setOpen(false);
    if (n.type === 'message') navigate('/messages');
    else if (n.type === 'follow') navigate(`/profile/${n.actor?._id ?? n.actor}`);
    else navigate('/dashboard');
  };

  const badge = unreadNotifications > 99 ? '99+' : unreadNotifications;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        id="btn-notifications"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadNotifications > 0
            ? `Notifications, ${unreadNotifications} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <span className="text-lg" aria-hidden="true">🔔</span>
        {unreadNotifications > 0 && (
          <span
            className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white animate-scale-in"
            style={{ background: 'var(--danger)', height: 18 }}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="glass-panel absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-2rem))] animate-scale-in"
          style={{ transformOrigin: 'top right' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--glass-border)' }}
          >
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="cursor-pointer text-xs transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto">
            {error && (
              <div className="p-3">
                <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>
              </div>
            )}

            {loading && (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div className="flex-1 space-y-2">
                      <Skeleton style={{ height: 10, width: '70%' }} />
                      <Skeleton style={{ height: 8, width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !items.length && !error && (
              <EmptyState icon="🔕" title="Nothing yet">
                Likes, comments, follows and messages will show up here.
              </EmptyState>
            )}

            {!loading &&
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: n.readAt ? 'transparent' : 'rgba(139,92,246,0.08)',
                  }}
                >
                  <Avatar src={n.actor?.pic} name={n.actor?.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">
                      <strong className="font-semibold">{n.actor?.name ?? 'Someone'}</strong>{' '}
                      <span style={{ color: 'var(--text-dim)' }}>{VERBS[n.type] ?? 'did something'}</span>
                    </span>
                    {n.preview && (
                      <span
                        className="mt-0.5 block truncate text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {n.preview}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  <span className="text-base" aria-hidden="true">{ICONS[n.type] ?? '🔔'}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
