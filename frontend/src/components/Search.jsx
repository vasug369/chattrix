import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';

export default function Search() {
  const navigate = useNavigate();
  const { isFollowing, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followBusy, setFollowBusy] = useState({});

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      api.get(`/api/user/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => { setResults(res.data); setSearched(true); })
        .catch(() => showToast('Search failed', 'error'))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleFollow = async (userId, currentlyFollowing) => {
    setFollowBusy((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.put(`/api/user/${userId}/${currentlyFollowing ? 'unfollow' : 'follow'}`, {});
      await refreshUser();
    } catch {
      showToast('Follow/unfollow failed', 'error');
    } finally {
      setFollowBusy((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <AppLayout activePath="/search">
      <div className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-semibold mb-6 font-poppins" style={{ color: 'var(--text-primary)' }}>Find People</h2>

        <input
          type="text"
          autoFocus
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 rounded-xl px-4 mb-6 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
        />

        {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Searching...</p>}

        {!loading && searched && results.length === 0 && (
          <div className="glass p-10 text-center animate-fade-in">
            <p className="text-4xl mb-3">🔎</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No users found for "{query}"</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {results.map((u) => {
            const following = isFollowing(u._id);
            return (
              <div key={u._id} className="glass p-4 flex items-center gap-4 animate-fade-in-up">
                <button onClick={() => navigate(`/profile/${u._id}`)} className="bg-transparent border-none p-0 cursor-pointer">
                  <Avatar user={u} size={11} />
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <button
                  onClick={() => toggleFollow(u._id, following)}
                  disabled={followBusy[u._id]}
                  className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                  style={{
                    background: following ? 'rgba(239, 68, 68, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                    color: following ? '#fca5a5' : '#c4b5fd',
                    border: `1px solid ${following ? 'rgba(239, 68, 68, 0.3)' : 'rgba(124, 58, 237, 0.3)'}`,
                    opacity: followBusy[u._id] ? 0.6 : 1,
                  }}
                >
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
