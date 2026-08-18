import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { Avatar, Banner, Button, Skeleton } from './ui/Glass';

/**
 * Condensed profile shown beside an open conversation.
 *
 * A drawer rather than a centred modal, and rather than navigating to
 * /profile/:id, because this is a *reference* action: the user wants to check
 * who they are talking to and carry on typing. A modal says "stop and deal
 * with me", and a navigation unmounts the thread and loses the scroll
 * position. WhatsApp Web, Telegram, Slack and Messenger all use a right-hand
 * pane here for the same reason.
 *
 * On a phone there is no room for both, so the same panel goes full-screen —
 * which is the push-a-screen behaviour those apps fall back to on mobile.
 *
 * Deliberately a summary, not a copy of the profile page: the full page stays
 * the source of truth for posts, and "View full profile" links to it. That
 * keeps this from drifting out of sync with /profile/:id.
 */
export default function ProfileDrawer({ userId, fallback, onClose }) {
  const { isOnline } = useSocket();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followBusy, setFollowBusy] = useState(false);

  const panelRef = useRef(null);
  // Captured before focus moves into the panel, so closing can put it back on
  // whatever opened the drawer. Without this, dismissing the panel drops focus
  // to <body> and a keyboard user restarts from the top of the page.
  const returnFocusRef = useRef(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    return () => returnFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .get(`/user/${userId}`)
      .then(({ data }) => {
        if (!cancelled) setProfile(data.data ?? data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load this profile'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleFollow = useCallback(async () => {
    if (!profile) return;
    const wasFollowing = profile.isFollowing;

    setFollowBusy(true);
    // Optimistic: the button is the whole point of the panel, so it should
    // respond immediately and roll back on failure rather than sit spinning.
    setProfile((p) => ({
      ...p,
      isFollowing: !wasFollowing,
      followerCount: (p.followerCount ?? 0) + (wasFollowing ? -1 : 1),
    }));

    try {
      await api.put(`/user/${userId}/${wasFollowing ? 'unfollow' : 'follow'}`);
    } catch (err) {
      setProfile((p) => ({
        ...p,
        isFollowing: wasFollowing,
        followerCount: (p.followerCount ?? 0) + (wasFollowing ? 1 : -1),
      }));
      setError(errorMessage(err, 'Could not update follow state'));
    } finally {
      setFollowBusy(false);
    }
  }, [profile, userId]);

  // Render from the sidebar's copy of the contact until the fetch lands, so
  // the panel opens with the right name and face instead of a skeleton.
  const name = profile?.name ?? fallback?.name ?? '';
  const pic = profile?.pic ?? fallback?.pic;
  const online = isOnline(userId);

  return (
    <div className="drawer-root" role="presentation">
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={name ? `${name}'s profile` : 'Profile'}
        className="drawer-panel glass-panel"
      >
        <header
          className="flex items-center justify-between gap-3 p-4"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <h2 className="text-sm font-semibold">Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-lg leading-none transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-dim)' }}
            aria-label="Close profile"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4">
              <Banner tone="error" onDismiss={() => setError('')}>
                {error}
              </Banner>
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            <Avatar src={pic} name={name || '?'} size={96} />

            <h3 className="mt-3 text-lg font-semibold">
              {name || <Skeleton style={{ height: 20, width: 140 }} />}
            </h3>

            <p
              className="mt-1 flex items-center justify-center gap-1.5 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: online ? 'var(--success)' : 'var(--text-muted)' }}
                aria-hidden="true"
              />
              {online ? 'Online' : 'Offline'}
            </p>

            {loading && !profile ? (
              <div className="mt-4 w-full space-y-2">
                <Skeleton style={{ height: 11, width: '80%', margin: '0 auto' }} />
                <Skeleton style={{ height: 11, width: '60%', margin: '0 auto' }} />
              </div>
            ) : (
              profile?.bio && (
                <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>
                  {profile.bio}
                </p>
              )
            )}
          </div>

          {profile && (
            <>
              <div
                className="mt-6 grid grid-cols-3 rounded-xl py-3 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {[
                  ['Posts', profile.postCount ?? 0],
                  ['Followers', profile.followerCount ?? 0],
                  ['Following', profile.followingCount ?? 0],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-base font-semibold tabular-nums">{value}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                {!profile.isSelf && (
                  <Button
                    variant={profile.isFollowing ? 'ghost' : 'primary'}
                    loading={followBusy}
                    onClick={toggleFollow}
                    className="w-full"
                  >
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}

                <Link to={`/profile/${userId}`} className="gl-btn gl-btn--ghost w-full">
                  View full profile
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
