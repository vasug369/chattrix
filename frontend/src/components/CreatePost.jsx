import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppLayout from './layout/AppLayout';

function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (image) formData.append('pic', image);

      await api.post('/api/post/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setTitle('');
      setContent('');
      setImage(null);
      setImagePreview(null);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activePath="/create-post">
      <div className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="glass p-8 sm:p-10 animate-fade-in-up">
          <h2 className="text-2xl font-bold mb-2 font-poppins" style={{ color: 'var(--text-primary)' }}>
            Create New Post
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Share your thoughts, ideas, or updates with your followers.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm animate-fade-in"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm animate-fade-in"
              style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              Post created successfully! Redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                Post Title
              </label>
              <input
                type="text"
                placeholder="What's on your mind?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                Content
              </label>
              <textarea
                rows="6"
                placeholder="Write your post content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 resize-y"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                Attach Photo (Optional)
              </label>

              {imagePreview ? (
                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sm"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  className="w-full h-32 rounded-xl flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <span className="text-2xl mb-2">📸</span>
                  <span className="text-sm font-medium">Click to upload image</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 h-11 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="px-8 h-11 rounded-xl text-white font-semibold text-sm tracking-wide cursor-pointer transition-all duration-300"
                style={{ background: 'var(--accent-gradient)', opacity: (loading || success) ? 0.7 : 1 }}
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

export default CreatePost;
