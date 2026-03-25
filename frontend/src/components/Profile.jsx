import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseURL = 'http://localhost:3000';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. Get current user ID
        const authRes = await axios.get(`${baseURL}/api/auth/validate`, { withCredentials: true });
        if (!authRes.data.authenticated) {
          navigate('/');
          return;
        }
        const userId = authRes.data.userId;

        // 2. Get user details
        const userRes = await axios.get(`${baseURL}/api/myProfile/${userId}`, { withCredentials: true });
        setUser(userRes.data);

        // 3. Get user's posts
        const postsRes = await axios.get(`${baseURL}/api/post/getUserPosts/${userId}`, { withCredentials: true });
        setPosts(postsRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const navItems = [
    { icon: '🏠', label: 'Home', path: '/dashboard' },
    { icon: '✍️', label: 'Create Post', path: '/create-post' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading profile...</p>
      </div>
    );
  }

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

        <div className="w-10" />
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
                color: item.path === '/profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: item.path === '/profile' ? 'var(--bg-card-hover)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (item.path !== '/profile') {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (item.path !== '/profile') {
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

        {/* ===== Main Content (Profile) ===== */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
          {user && (
            <div className="glass p-8 sm:p-10 mb-8 flex flex-col items-center text-center animate-fade-in-up">
              <div 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mb-4 flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-xl overflow-hidden"
                style={{ background: 'var(--accent-gradient)' }}
              >
                {user.pic && user.pic.includes('http') ? (
                  <img src={user.pic} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-poppins mb-1" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </p>
              
              <div className="flex gap-8 justify-center w-full max-w-md" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{posts.length}</span>
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Posts</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.followers?.length || 0}</span>
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Followers</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.following?.length || 0}</span>
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Following</span>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-xl font-semibold mb-5 font-poppins" style={{ color: 'var(--text-primary)' }}>
            Your Posts
          </h3>

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {posts.map((post, idx) => (
                <article
                  key={post._id}
                  className="glass p-5 transition-all duration-300 animate-fade-in-up flex flex-col h-full"
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h4 className="font-semibold mb-2 line-clamp-1" style={{ color: 'var(--text-primary)' }}>{post.title}</h4>
                  <p className="text-xs mb-4 line-clamp-3 flex-1" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
                  
                  {post.pic && (
                    <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-black/20">
                      <img src={post.pic} alt="Post" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-auto pt-3 text-xs" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="glass p-10 text-center animate-fade-in">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                You haven't created any posts yet.
              </p>
              <button 
                onClick={() => navigate('/create-post')}
                className="mt-4 px-6 h-10 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-300"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Create your first post
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;
