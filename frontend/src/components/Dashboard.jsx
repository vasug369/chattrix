import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseURL = 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({}); // { postId: boolean }
  const [commentInputs, setCommentInputs] = useState({}); // { postId: text }

  useEffect(() => {
    // Fetch current user
    axios.get(`${baseURL}/api/auth/validate`, { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          setCurrentUserId(res.data.userId);
        }
      })
      .catch(console.log);

    // Fetch feed
    axios.get(`${baseURL}/api/post/feed`, { withCredentials: true })
      .then((res) => {
        const allPosts = res.data
          .filter(Array.isArray)
          .flat()
          .filter(post => post._id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setData(allPosts);
      })
      .catch((err) => {
        console.log(err);
        navigate('/');
      });
  }, []);

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const res = await axios.post(`${baseURL}/api/post/${postId}/comment`, 
        { content }, 
        { withCredentials: true }
      );
      setData((prevData) =>
        prevData.map((post) =>
          post._id === postId ? res.data : post
        )
      );
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.log(err);
      alert('Failed to post comment');
    }
  };

  const filteredData = data.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showHeart = (e) => {
    const heart = document.createElement('div');
    heart.innerText = '❤️';
    heart.className = 'flying-heart';
    heart.style.left = `${e.clientX - 10}px`;
    heart.style.top = `${e.clientY - 20}px`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
  };

  const toggleFollow = async (authorId, currentlyFollowing) => {
    try {
      const url = `${baseURL}/api/user/${authorId}/${currentlyFollowing ? 'unfollow' : 'follow'}`;
      await axios.put(url, {}, { withCredentials: true });
      setData((prevData) =>
        prevData.map((post) =>
          post.author._id === authorId
            ? { ...post, author: { ...post.author, isFollowing: !currentlyFollowing } }
            : post
        )
      );
    } catch (error) {
      console.log('Follow/unfollow error:', error);
    }
  };

  const handleLogout = () => {
    axios.get(`${baseURL}/api/auth/logout`, { withCredentials: true })
      .then(() => navigate('/'))
      .catch((err) => console.log(err));
  };

  const handleLike = async (e, itemId) => {
    showHeart(e);
    try {
      const res = await axios.put(`${baseURL}/api/post/${itemId}/like`, {}, { withCredentials: true });
      setData((prevData) =>
        prevData.map((post) =>
          post._id === itemId ? { ...post, likes: res.data.likes } : post
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const handleDislike = async (itemId) => {
    try {
      const res = await axios.put(`${baseURL}/api/post/${itemId}/like`, {}, { withCredentials: true });
      setData((prevData) =>
        prevData.map((post) =>
          post._id === itemId ? { ...post, likes: res.data.likes } : post
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${baseURL}/api/post/${itemId}`, { withCredentials: true });
      setData((prevData) => prevData.filter((post) => post._id !== itemId));
    } catch (err) {
      console.log(err);
      alert('Failed to delete post');
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
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>

        {/* Hamburger (mobile) */}
        <button
          id="btn-hamburger"
          className="lg:hidden text-2xl cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h1 className="text-lg sm:text-xl font-bold font-poppins" style={{ color: 'var(--text-primary)' }}>
            Chattrix
          </h1>
        </div>

        {/* Search */}
        <div className="hidden sm:flex flex-1 max-w-md mx-4">
          <input
            id="input-search"
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-glow)';
              e.target.style.boxShadow = '0 0 15px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="h-9 px-4 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
        >
          Logout
        </button>
      </header>

      {/* Mobile search (below header) */}
      <div className="sm:hidden px-4 py-3">
        <input
          id="input-search-mobile"
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-10 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
          }}
        />
      </div>

      {/* ===== Main Layout ===== */}
      <div className="flex relative">

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== Left Sidebar ===== */}
        <aside
          className={`
            fixed lg:sticky top-0 lg:top-[65px] left-0 z-50 lg:z-10
            w-64 lg:w-56 h-full lg:h-[calc(100vh-65px)]
            p-6 flex flex-col gap-2
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          {/* Close btn mobile */}
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
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* ===== Main Feed ===== */}
        <main className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">

          <h2 className="text-xl font-semibold mb-6 font-poppins" style={{ color: 'var(--text-primary)' }}>
            Your Feed
          </h2>

          {filteredData.length > 0 ? (
            <div className="flex flex-col gap-5">
              {filteredData.map((item, index) => (
                <article
                  key={item._id}
                  className="glass p-6 sm:p-8 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 60}ms` }}
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
                  {/* Author row */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'var(--accent-gradient)' }}>
                      {item.author?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.author?.name || 'Unknown'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {currentUserId === item.author?._id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newTitle = window.prompt('Update title:', item.title);
                            const newContent = window.prompt('Update content:', item.content);
                            if (newTitle && newContent) {
                              axios.put(`${baseURL}/api/post/update/${item._id}`, 
                                { title: newTitle, content: newContent }, 
                                { withCredentials: true }
                              ).then(res => {
                                setData(prev => prev.map(p => p._id === item._id ? res.data : p));
                              }).catch(err => alert('Failed to update'));
                            }
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#93c5fd',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleFollow(item.author._id, item.author.isFollowing)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                        style={{
                          background: item.author.isFollowing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                          color: item.author.isFollowing ? '#fca5a5' : '#c4b5fd',
                          border: `1px solid ${item.author.isFollowing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(124, 58, 237, 0.3)'}`,
                        }}
                      >
                        {item.author.isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {/* Post content */}
                  <h3 className="text-base sm:text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                    {item.content}
                  </p>

                  {/* Post Image */}
                  {item.pic && (
                    <div className="w-full rounded-xl overflow-hidden mb-4 bg-black/20">
                      <img 
                        src={item.pic} 
                        alt="Post attachment" 
                        className="w-full max-h-[500px] object-contain"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={(e) => handleLike(e, item._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 bg-transparent"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.color = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      ❤️ {item.likes.length}
                    </button>
                    <button
                      onClick={() => handleDislike(item._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 bg-transparent"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(100, 116, 139, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      👎 Dislike
                    </button>
                    <button
                      onClick={() => toggleComments(item._id)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 bg-transparent"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      💬 {item.comments?.length || 0}
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments[item._id] && (
                    <div className="mt-4 pt-4 animate-fade-in-up" style={{ borderTop: '1px solid var(--border-color)' }}>
                      {/* Comment Input */}
                      <form onSubmit={(e) => handleCommentSubmit(e, item._id)} className="flex gap-2 mb-4">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[item._id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [item._id]: e.target.value }))}
                          className="flex-1 h-9 rounded-lg px-3 text-xs text-white placeholder-gray-500 outline-none transition-all duration-300"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--border-glow)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                        />
                        <button
                          type="submit"
                          disabled={!commentInputs[item._id]?.trim()}
                          className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-300"
                          style={{ 
                            background: 'var(--accent-gradient)', 
                            color: 'white',
                            opacity: commentInputs[item._id]?.trim() ? 1 : 0.5 
                          }}
                        >
                          Post
                        </button>
                      </form>

                      {/* Comments List */}
                      {item.comments?.length > 0 ? (
                        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                          {item.comments.map((comment, idx) => (
                            <div key={comment._id || idx} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                                style={{ background: 'var(--bg-card-hover)' }}>
                                {comment.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 glass p-3 rounded-lg rounded-tl-none">
                                <div className="flex items-baseline justify-between mb-1">
                                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {comment.name || 'Unknown'}
                                  </span>
                                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first!</p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="glass p-10 text-center animate-fade-in">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No posts yet. Start following people to see their posts!
              </p>
            </div>
          )}
        </main>

        {/* ===== Right Sidebar ===== */}
        <aside className="hidden xl:block w-64 shrink-0 sticky top-[65px] h-[calc(100vh-65px)] p-6"
          style={{ borderLeft: '1px solid var(--border-color)' }}>

          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Suggested for you
          </p>

          {['John Doe', 'Jane Smith', 'Alex Chen'].map((name) => (
            <div key={name}
              className="flex items-center gap-3 p-3 rounded-xl mb-2 transition-all duration-200 cursor-pointer"
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'var(--accent-gradient)' }}>
                {name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Suggested</p>
              </div>
              <button
                className="text-xs font-semibold cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--accent-primary)' }}
              >
                Follow
              </button>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
