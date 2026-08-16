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
  const [draft, setDraft] = useState({ name: '', bio: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The chosen file plus a local object URL to preview it. The preview is
  // revoked when it is replaced or the form closes — object URLs are held
  // until the document unloads otherwise, which on this page means every
  // photo the user auditions stays in memory.
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
      setDraft({ name: p.name ?? '', bio: p.bio ?? '' });
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

  /** Drop the preview URL as soon as it stops being shown. */
  const clearPendingPhoto = useCallback(() => {
    setPhotoPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return '';
    });
    setPendingPhoto(null);
    setPhotoError('');
  }, []);

  const choosePhoto = (e) => {
    const file = e.target.files?.[0];
    // Resetting the input means picking the *same* file again still fires a
    // change event, which it otherwise would not after a failed attempt.
    e.target.value = '';
    if (!file) return;

    // Checked here as well as on the server: a 5MB limit discovered only after
    // uploading a 12MB photo over mobile data is a poor way to learn it.
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('That image is larger than 5MB.');
      return;
    }

    clearPendingPhoto();
    setPendingPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = async () => {
    setSaving(true);
    try {
      const { data } = await api.delete('/user/me/avatar');
      setProfile((p) => ({ ...p, ...data.data }));
      clearPendingPhoto();
      await refresh();
    } catch (err) {
      setPhotoError(errorMessage(err, 'Could not remove the photo'));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setPhotoError('');
    setSaving(true);
    try {
      // The photo goes first and separately: it is multipart, and if it fails
      // the name and bio should not silently save as though nothing happened.
      if (pendingPhoto) {
        const form = new FormData();
        form.append('pic', pendingPhoto);
        const { data } = await api.post('/user/me/avatar', form);
        setProfile((p) => ({ ...p, ...data.data }));
        clearPendingPhoto();
      }

      // Only the fields the server accepts, and only ones that changed —
      // the endpoint rejects unknown keys outright.
      const payload = {};
      if (draft.name !== profile.name) payload.name = draft.name;
      if (draft.bio !== (profile.bio ?? '')) payload.bio = draft.bio;

      if (Object.keys(payload).length > 0) {
        const { data } = await api.patch('/user/me', payload);
        setProfile((p) => ({ ...p, ...data.data }));
      }

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

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-dim)' }}>
                Profile photo
              </span>

              <div className="flex items-center gap-4">
                <Avatar src={photoPreview || profile.pic} name={draft.name || profile.name} size={64} />

                <div className="flex flex-wrap items-center gap-2">
                  {/* The native control is hidden rather than styled: browsers
                      barely allow styling it, and a label pointed at it is the
                      accessible way to get a button that opens the picker. */}
                  <input
                    id="input-profile-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={choosePhoto}
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => document.getElementById('input-profile-photo')?.click()}
                  >
                    {photoPreview ? 'Choose a different photo' : 'Choose photo'}
                  </Button>

                  {photoPreview && (
                    <Button type="button" variant="ghost" onClick={clearPendingPhoto}>
                      Discard
                    </Button>
                  )}

                  {!photoPreview && profile.pic && (
                    <Button type="button" variant="ghost" onClick={removePhoto} disabled={saving}>
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {photoPreview
                  ? 'Looks good — press Save changes to upload it.'
                  : 'JPEG, PNG or WebP, up to 5MB. Cropped to a square.'}
              </p>

              {photoError && (
                <p className="text-xs" style={{ color: 'var(--danger, #f87171)' }}>{photoError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={saving}>Save changes</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setFormErrors({});
                  clearPendingPhoto();
                  setDraft({ name: profile.name, bio: profile.bio ?? '' });
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
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate('/messages', {
                          state: {
                            contact: {
                              _id: profile._id,
                              name: profile.name,
                              pic: profile.pic,
                              bio: profile.bio,
                            },
                          },
                        })
                      }
                    >
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant={following ? 'ghost' : 'primary'}
                      loading={followBusy}
                      onClick={toggleFollow}
                    >
                      {following ? 'Following' : 'Follow'}
                    </Button>
                  </>
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
