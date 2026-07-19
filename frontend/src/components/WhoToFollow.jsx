import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './layout/AppLayout';

export default function WhoToFollow() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  useEffect(() => {
    if (!user?.id) return;
    api.get('/api/user/getAllUsers')
      .then((res) => {
        const notFollowed = res.data
          .filter((u) => u._id !== user.id && !user.following?.includes(u._id))
          .slice(0, 4);
        setSuggestions(notFollowed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, user?.following?.length]);

  const handleFollow = async (userId) => {
    setBusy((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.put(`/api/user/${userId}/follow`, {});
      await refreshUser();
      setSuggestions((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      showToast('Follow failed', 'error');
    } finally {
      setBusy((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="glass p-5 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
        Who to follow
      </p>
      <div className="flex flex-col gap-4">
        {suggestions.map((u) => (
          <div key={u._id} className="flex items-center gap-3">
            <button onClick={() => navigate(`/profile/${u._id}`)} className="bg-transparent border-none p-0 cursor-pointer shrink-0">
              <Avatar user={u} size={9} />
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
            </div>
            <button
              onClick={() => handleFollow(u._id)}
              disabled={busy[u._id]}
              className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-all duration-200"
              style={{
                background: 'rgba(124, 58, 237, 0.15)',
                color: '#c4b5fd',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                opacity: busy[u._id] ? 0.6 : 1,
              }}
            >
              Follow
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/search')}
        className="w-full mt-4 pt-3 text-xs font-medium cursor-pointer bg-transparent border-none text-left"
        style={{ color: 'var(--accent-secondary)', borderTop: '1px solid var(--border-color)' }}
      >
        Find more people →
      </button>
    </div>
  );
}
