import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AppLayout, { Avatar } from './layout/AppLayout';

function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const targetId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/myProfile/${targetId}`),
      api.get(`/api/post/getUserPosts/${targetId}?page=1`),
    ])
      .then(([profileRes, postsRes]) => {
        setProfile(profileRes.data);
        setPosts(postsRes.data.posts || []);
        setHasMore(Boolean(postsRes.data.hasMore));
        setPage(1);
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [targetId]);

  const loadMorePosts = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get(`/api/post/getUserPosts/${targetId}?page=${nextPage}`);
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(Boolean(res.data.hasMore));
      setPage(nextPage);
    } catch {
      showToast('Failed to load more posts', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    setFollowBusy(true);
    try {
      const url = `/api/user/${profile._id}/${profile.isFollowing ? 'unfollow' : 'follow'}`;
      await api.put(url, {});
      setProfile((prev) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.followersCount + (prev.isFollowing ? -1 : 1),
      }));
      await refreshUser();
    } catch {
      showToast('Follow/unfollow failed', 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout activePath="/profile">
        <div className="min-w-0 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
          <div className="glass p-10 sm:p-12 mb-10 flex flex-col items-center animate-fade-in" style={{ opacity: 0.6 }}>
            <div className="w-28 h-28 rounded-full mb-4" style={{ background: 'var(--bg-card-hover)' }} />
            <div className="h-6 w-40 rounded mb-2" style={{ background: 'var(--bg-card-hover)' }} />
            <div className="h-4 w-56 rounded" style={{ background: 'var(--bg-card-hover)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="glass animate-fade-in" style={{ height: '160px', opacity: 0.6 }} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout activePath="/profile">
        <div className="min-h-[60vh] flex items-center justify-center">
          <p style={{ color: 'var(--text-secondary)' }}>User not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePath="/profile">
      <div className="min-w-0 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="glass p-10 sm:p-12 mb-10 flex flex-col items-center text-center animate-fade-in-up">
          <Avatar user={profile} size={28} />
          <h2 className="text-2xl sm:text-3xl font-bold font-poppins mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>
            {profile.name}
          </h2>
          {isOwnProfile && <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>}
          {profile.bio && <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>}

          <div className="flex gap-8 justify-center w-full max-w-md" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div className="flex flex-col">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.postsCount}</span>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.followersCount}</span>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.followingCount}</span>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Following</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/settings')}
                className="px-6 h-10 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  className="px-6 h-10 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300"
                  style={{
                    background: profile.isFollowing ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-gradient)',
                    color: profile.isFollowing ? '#fca5a5' : 'white',
                    border: profile.isFollowing ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                    opacity: followBusy ? 0.6 : 1,
                  }}
                >
                  {profile.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  onClick={() => navigate('/messages', { state: { userId: profile._id } })}
                  className="px-6 h-10 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300"
                  style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-5 font-poppins" style={{ color: 'var(--text-primary)' }}>
          {isOwnProfile ? 'Your Posts' : `${profile.name}'s Posts`}
        </h3>

        {posts.length > 0 ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {posts.map((post, idx) => (
              <article
                key={post._id}
                className="glass p-6 transition-all duration-300 animate-fade-in-up flex flex-col h-full"
                style={{ animationDelay: `${idx * 60}ms` }}
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
          {hasMore && (
            <button
              onClick={loadMorePosts}
              disabled={loadingMore}
              className="mx-auto mt-6 flex px-6 h-10 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
              style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
          </>
        ) : (
          <div className="glass p-10 text-center animate-fade-in">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {isOwnProfile ? "You haven't created any posts yet." : `${profile.name} hasn't posted anything yet.`}
            </p>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/create-post')}
                className="mt-4 px-6 h-10 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-300"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Create your first post
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Profile;
