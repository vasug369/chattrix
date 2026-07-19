import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';
import EditPostModal from './EditPostModal';
import WhoToFollow from './WhoToFollow';
import QuickComposer from './QuickComposer';

function Dashboard() {
  const navigate = useNavigate();
  const { user, isFollowing, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [followBusy, setFollowBusy] = useState({});

  useEffect(() => {
    api.get('/api/post/feed?page=1')
      .then((res) => {
        setData(res.data.posts || []);
        setHasMore(Boolean(res.data.hasMore));
        setPage(1);
      })
      .catch(() => showToast('Failed to load your feed', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get(`/api/post/feed?page=${nextPage}`);
      setData((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(Boolean(res.data.hasMore));
      setPage(nextPage);
    } catch {
      showToast('Failed to load more posts', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const res = await api.post(`/api/post/${postId}/comment`, { content });
      setData((prev) => prev.map((post) => (post._id === postId ? res.data : post)));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch {
      showToast('Failed to post comment', 'error');
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
    setFollowBusy((prev) => ({ ...prev, [authorId]: true }));
    try {
      const url = `/api/user/${authorId}/${currentlyFollowing ? 'unfollow' : 'follow'}`;
      await api.put(url, {});
      await refreshUser();
    } catch {
      showToast('Follow/unfollow failed', 'error');
    } finally {
      setFollowBusy((prev) => ({ ...prev, [authorId]: false }));
    }
  };

  const handleLike = async (e, itemId) => {
    showHeart(e);
    try {
      const res = await api.put(`/api/post/${itemId}/like`, {});
      setData((prev) => prev.map((post) => (post._id === itemId ? { ...post, likes: res.data.likes } : post)));
    } catch {
      showToast('Failed to like post', 'error');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/api/post/${itemId}`);
      setData((prev) => prev.filter((post) => post._id !== itemId));
      showToast('Post deleted', 'success');
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  const headerSearch = (
    <input
      type="text"
      placeholder="Search posts..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full max-w-md h-10 rounded-xl px-4 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300"
      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
    />
  );

  return (
    <AppLayout activePath="/dashboard" headerExtra={headerSearch} rightRail={<WhoToFollow />}>
      <section className="min-w-0 px-4 sm:px-6 py-8 max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-6 font-poppins" style={{ color: 'var(--text-primary)' }}>
          Your Feed
        </h2>

        <QuickComposer onPosted={(post) => setData((prev) => [post, ...prev])} />

          {loading ? (
            <div className="flex flex-col gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass p-6 sm:p-8 animate-fade-in" style={{ height: '160px' }} />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="flex flex-col gap-5">
              {filteredData.map((item, index) => {
                const liked = item.likes?.includes(user?.id);
                const followingAuthor = isFollowing(item.author?._id);
                const isOwn = user?.id === item.author?._id;

                return (
                  <article
                    key={item._id}
                    className="glass p-6 sm:p-8 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <button onClick={() => navigate(isOwn ? '/profile' : `/profile/${item.author?._id}`)} className="bg-transparent border-none p-0 cursor-pointer">
                        <Avatar user={item.author} size={10} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(isOwn ? '/profile' : `/profile/${item.author?._id}`)}
                          className="text-sm font-semibold truncate bg-transparent border-none p-0 cursor-pointer text-left block"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.author?.name || 'Unknown'}
                        </button>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      {isOwn ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPost(item)}
                            className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleFollow(item.author._id, followingAuthor)}
                          disabled={followBusy[item.author._id]}
                          className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
                          style={{
                            background: followingAuthor ? 'rgba(239, 68, 68, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                            color: followingAuthor ? '#fca5a5' : '#c4b5fd',
                            border: `1px solid ${followingAuthor ? 'rgba(239, 68, 68, 0.3)' : 'rgba(124, 58, 237, 0.3)'}`,
                            opacity: followBusy[item.author._id] ? 0.6 : 1,
                          }}
                        >
                          {followingAuthor ? 'Unfollow' : 'Follow'}
                        </button>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{item.content}</p>

                    {item.pic && (
                      <div className="w-full rounded-xl overflow-hidden mb-4 bg-black/20">
                        <img src={item.pic} alt="Post attachment" className="w-full max-h-[500px] object-contain" />
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <button
                        onClick={(e) => handleLike(e, item._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                        style={{
                          color: liked ? '#fca5a5' : 'var(--text-secondary)',
                          border: `1px solid ${liked ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                          background: liked ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                        }}
                      >
                        {liked ? '❤️' : '🤍'} {item.likes?.length || 0}
                      </button>
                      <button
                        onClick={() => toggleComments(item._id)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      >
                        💬 {item.comments?.length || 0}
                      </button>
                    </div>

                    {expandedComments[item._id] && (
                      <div className="mt-4 pt-4 animate-fade-in-up" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <form onSubmit={(e) => handleCommentSubmit(e, item._id)} className="flex gap-2 mb-4">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[item._id] || ''}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [item._id]: e.target.value }))}
                            className="flex-1 h-9 rounded-lg px-3 text-xs text-white placeholder-gray-500 outline-none transition-all duration-300"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
                          />
                          <button
                            type="submit"
                            disabled={!commentInputs[item._id]?.trim()}
                            className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-300"
                            style={{ background: 'var(--accent-gradient)', color: 'white', opacity: commentInputs[item._id]?.trim() ? 1 : 0.5 }}
                          >
                            Post
                          </button>
                        </form>

                        {item.comments?.length > 0 ? (
                          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {item.comments.map((comment, idx) => (
                              <div key={comment._id || idx} className="flex gap-3">
                                <Avatar user={comment.author} size={8} />
                                <div className="flex-1 glass p-3 rounded-lg rounded-tl-none">
                                  <div className="flex items-baseline justify-between mb-1">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{comment.name || 'Unknown'}</span>
                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
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
                );
              })}

              {!searchTerm && hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="self-center px-6 h-10 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
                  style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', opacity: loadingMore ? 0.6 : 1 }}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          ) : (
            <div className="glass p-10 text-center animate-fade-in">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
                No posts yet. Follow people to see their posts here, or create your own!
              </p>
              <button onClick={() => navigate('/search')} className="px-6 h-10 rounded-xl text-white font-semibold text-sm cursor-pointer" style={{ background: 'var(--accent-gradient)' }}>
                Find people to follow
              </button>
            </div>
          )}
        </section>

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(updated) => {
            setData((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
            setEditingPost(null);
            showToast('Post updated', 'success');
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </AppLayout>
  );
}

export default Dashboard;
