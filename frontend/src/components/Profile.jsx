import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PostCard from './PostCard';
import { Avatar, Banner, Button, EmptyState, Field, GlassCard, Skeleton, TextArea } from './ui/Glass';

/**
 * Profile page for the signed-in user (/profile) and for anybody else
 * (/profile/:userId).
 *
 * Viewing another user's profile had no route at all before; the page could
 * only ever render your own.
 */
export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, refresh } = useAuth();

  const targetId = userId ?? me?.id;
  const isSelf = !userId || userId === me?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', bio: '', pic: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/user/${targetId}`),
        api.get(`/post/getUserPosts/${targetId}`, { params: { limit: 50 } }),
      ]);
      const p = profileRes.data.data;
      setProfile(p);
      setFollowing(Boolean(p.isFollowing));
      setDraft({ name: p.name ?? '', bio: p.bio ?? '', pic: p.pic ?? '' });
      setPosts(postsRes.data.items);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this profile'));
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic
    try {
      await api.put(`/user/${targetId}/${wasFollowing ? 'unfollow' : 'follow'}`);
      setProfile((p) => ({
        ...p,
        followerCount: (p.followerCount ?? 0) + (wasFollowing ? -1 : 1),
      }));
    } catch (err) {
      setFollowing(wasFollowing);
      setError(errorMessage(err, 'Could not update follow state'));
    } finally {
      setFollowBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      // Only the fields the server accepts, and only ones that changed —
      // the endpoint rejects unknown keys outright.
      const payload = {};
      if (draft.name !== profile.name) payload.name = draft.name;
      if (draft.bio !== (profile.bio ?? '')) payload.bio = draft.bio;
      if (draft.pic !== (profile.pic ?? '')) payload.pic = draft.pic;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const { data } = await api.patch('/user/me', payload);
      setProfile((p) => ({ ...p, ...data.data }));
      setEditing(false);
      await refresh();
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setFormErrors(fields);
      else setError(errorMessage(err, 'Could not save your profile'));
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Delete your account? Your posts and messages go with it. This cannot be undone.')) return;
    try {
      await api.delete('/user/me');
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not delete your account'));
    }
  };

  if (loading) {
    return (
      <GlassCard variant="glass-strong" className="p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <Skeleton style={{ width: 88, height: 88, borderRadius: '50%' }} />
          <div className="flex-1 space-y-3">
            <Skeleton style={{ height: 16, width: '40%' }} />
            <Skeleton style={{ height: 12, width: '60%' }} />
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error && !profile) {
    return (
      <GlassCard className="p-6">
        <Banner tone="error">{error}</Banner>
        <Button variant="ghost" onClick={load}>Try again</Button>
      </GlassCard>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      {error && <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>}

      <GlassCard variant="glass-strong" className="p-6 sm:p-8 animate-fade-in-up">
        {editing ? (
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <h1 className="text-xl font-bold">Edit profile</h1>

            <Field
              id="input-profile-name"
              label="Display name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              error={formErrors.name}
              maxLength={50}
            />

            <TextArea
              id="input-profile-bio"
              label="Bio"
              placeholder="A sentence about you"
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              error={formErrors.bio}
              maxLength={160}
              style={{ minHeight: '5rem', resize: 'vertical' }}
            />

            <Field
              id="input-profile-pic"
              label="Profile picture URL"
              type="url"
              placeholder="https://…"
              value={draft.pic}
              onChange={(e) => setDraft((d) => ({ ...d, pic: e.target.value }))}
              error={formErrors.pic}
            />

            <div className="flex gap-3">
              <Button type="submit" loading={saving}>Save changes</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setFormErrors({});
                  setDraft({ name: profile.name, bio: profile.bio ?? '', pic: profile.pic ?? '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <Avatar src={profile.pic} name={profile.name} size={88} />

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.bio && (
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--text-dim)' }}>
                    {profile.bio}
                  </p>
                )}
                {isSelf && me?.email && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {me.email}
                    {!me.isAccountVerified && ' · unverified'}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {isSelf ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                      Edit profile
                    </Button>
                    <Button variant="danger" size="sm" onClick={deleteAccount}>
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant={following ? 'ghost' : 'primary'}
                    loading={followBusy}
                    onClick={toggleFollow}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ['Posts', profile.postCount ?? posts.length],
                ['Followers', profile.followerCount ?? 0],
                ['Following', profile.followingCount ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </GlassCard>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {isSelf ? 'Your posts' : `Posts by ${profile.name}`}
        </h2>

        {!posts.length ? (
          <GlassCard>
            <EmptyState icon="📝" title="No posts yet">
              {isSelf ? 'Your posts will appear here once you write one.' : 'This user hasn’t posted yet.'}
            </EmptyState>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={me?.id}
                onChange={(updated) =>
                  setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)))
                }
                onDelete={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
                onError={setError}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
