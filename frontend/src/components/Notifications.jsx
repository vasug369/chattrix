import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';

const VERB = {
  follow: 'started following you',
  like: 'liked your post',
  comment: 'commented on your post',
  message: 'sent you a message',
};

const ICON = { follow: '👤', like: '❤️', comment: '💬', message: '✉️' };

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/notifications')
      .then((res) => setNotifications(res.data))
      .catch(() => showToast('Failed to load notifications', 'error'))
      .finally(() => setLoading(false));

    api.put('/api/notifications/read-all').catch(() => {});
  }, []);

  const handleClick = (n) => {
    if (n.type === 'follow') navigate(`/profile/${n.sender._id}`);
    else if (n.type === 'message') navigate('/messages');
    else navigate('/dashboard');

    if (!n.read) {
      api.put(`/api/notifications/${n._id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    }
  };

  return (
    <AppLayout activePath="/notifications">
      <div className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-semibold mb-6 font-poppins" style={{ color: 'var(--text-primary)' }}>Notifications</h2>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="glass p-10 text-center animate-fade-in">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>You're all caught up. No notifications yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n, idx) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className="glass p-4 flex items-center gap-4 text-left cursor-pointer transition-all duration-200 animate-fade-in-up border-none"
                style={{ animationDelay: `${idx * 30}ms`, background: n.read ? 'var(--bg-card)' : 'var(--bg-card-hover)' }}
              >
                <Avatar user={n.sender} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-semibold">{n.sender?.name || 'Someone'}</span> {VERB[n.type] || 'interacted with you'}
                    {n.type !== 'follow' && n.post?.title ? <span style={{ color: 'var(--text-secondary)' }}> — "{n.post.title}"</span> : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</p>
                </div>
                <span className="text-lg shrink-0">{ICON[n.type] || '🔔'}</span>
                {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-secondary)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
