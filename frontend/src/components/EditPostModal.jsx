import React, { useState } from 'react';
import api from '../api/axios';

export default function EditPostModal({ post, onClose, onSaved, onError }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(`/api/post/update/${post._id}`, { title: title.trim(), content: content.trim() });
      onSaved(res.data);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="glass-strong w-full max-w-md p-6 sm:p-8 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-5 font-poppins" style={{ color: 'var(--text-primary)' }}>Edit post</h3>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full h-11 rounded-xl px-4 text-sm text-white outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
          />
          <textarea
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            className="w-full rounded-xl p-4 text-sm text-white outline-none resize-y"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
          />
          <div className="flex gap-3 justify-end mt-1">
            <button type="button" onClick={onClose} className="px-5 h-10 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-6 h-10 rounded-xl text-white font-semibold text-sm cursor-pointer"
              style={{ background: 'var(--accent-gradient)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
