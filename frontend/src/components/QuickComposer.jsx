import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './layout/AppLayout';

export default function QuickComposer({ onPosted }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const reset = () => {
    setExpanded(false);
    setTitle('');
    setContent('');
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/api/post/create', {
        title: title.trim() || content.trim().slice(0, 60),
        content: content.trim(),
      });
      onPosted?.(res.data);
      reset();
      showToast('Posted!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="glass p-4 sm:p-5 mb-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Avatar user={user} size={9} />
        </div>
        <div className="flex-1 min-w-0">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full h-11 rounded-xl px-4 text-sm text-left cursor-pointer transition-all duration-300"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
            >
              What's on your mind?
            </button>
          ) : (
            <form onSubmit={handlePost} className="flex flex-col gap-3 animate-fade-in-up">
              <input
                type="text"
                autoFocus
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
              <textarea
                rows="3"
                placeholder="Share something with your followers..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 resize-y"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/create-post')}
                  className="text-xs font-medium cursor-pointer bg-transparent border-none flex items-center gap-1.5"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  📸 Add a photo
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 h-9 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!content.trim() || posting}
                    className="px-5 h-9 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-300"
                    style={{ background: 'var(--accent-gradient)', opacity: (!content.trim() || posting) ? 0.5 : 1 }}
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
