import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseURL = 'http://localhost:3000';

function CreatePost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      await axios.post(`${baseURL}/api/post/create`, formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess(true);
      setTitle('');
      setContent('');
      setImage(null);
      setImagePreview(null);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { icon: '🏠', label: 'Home', path: '/dashboard' },
    { icon: '✍️', label: 'Create Post', path: '/create-post' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      {/* ===== Top Navbar ===== */}
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        
        <button
          className="lg:hidden text-2xl cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h1 className="text-lg sm:text-xl font-bold font-poppins cursor-pointer" 
              style={{ color: 'var(--text-primary)' }}
              onClick={() => navigate('/dashboard')}>
            Chattrix
          </h1>
        </div>

        <div className="w-10" /> {/* Balancer */}
      </header>

      {/* ===== Main Layout ===== */}
      <div className="flex relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ===== Left Sidebar ===== */}
        <aside
          className={`
            fixed lg:sticky top-0 lg:top-[57px] left-0 z-50 lg:z-10
            w-64 lg:w-56 h-full lg:h-[calc(100vh-57px)]
            p-5 flex flex-col gap-2
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          <button
            className="lg:hidden self-end text-xl mb-2 cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Menu
          </p>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 w-full text-left bg-transparent border-none"
              style={{ 
                color: item.path === '/create-post' ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: item.path === '/create-post' ? 'var(--bg-card-hover)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (item.path !== '/create-post') {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (item.path !== '/create-post') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* ===== Main Content ===== */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full">
          <div className="glass p-6 sm:p-8 animate-fade-in-up">
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
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'var(--bg-input-focus)';
                    e.target.style.borderColor = 'var(--border-glow)';
                    e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'var(--bg-input)';
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
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
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'var(--bg-input-focus)';
                    e.target.style.borderColor = 'var(--border-glow)';
                    e.target.style.boxShadow = '0 0 20px var(--accent-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'var(--bg-input)';
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Photo Upload Area */}
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
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-full h-32 rounded-xl flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden"
                    style={{
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span className="text-2xl mb-2">📸</span>
                    <span className="text-sm font-medium">Click to upload image</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 h-11 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--border-glow)';
                    e.target.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.color = 'var(--text-secondary)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="px-8 h-11 rounded-xl text-white font-semibold text-sm tracking-wide cursor-pointer transition-all duration-300"
                  style={{
                    background: 'var(--accent-gradient)',
                    opacity: (loading || success) ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !success) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px var(--accent-glow)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CreatePost;
