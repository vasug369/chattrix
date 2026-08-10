import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Banner, Button, EmptyState, GlassCard, Skeleton } from './ui/Glass';

const PAGE_SIZE = 15;

/**
 * Dedicated people search — separate from the post search on the feed.
 * Backed by the existing `/user/search` endpoint (matches name or email),
 * so only the username half of that is surfaced here.
 */
export default function SearchPeople() {
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followBusyId, setFollowBusyId] = useState(null);

  const searchTimer = useRef(null);

  const runSearch = useCallback(async (pageNum, q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasMore(false);
      setError('');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const isFirst = pageNum === 1;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const { data } = await api.get('/user/search', {
        params: { q: trimmed, page: pageNum, limit: PAGE_SIZE },
      });
      const items = data.items.map((u) => ({
        ...u,
        isFollowing: (u.followers ?? []).some((id) => id === me?.id),
      }));
      setResults((prev) => (isFirst ? items : [...prev, ...items]));
      setHasMore(data.pagination.page < data.pagination.pages);
      setPage(data.pagination.page);
    } catch (err) {
      setError(errorMessage(err, 'Could not search for people'));
      if (isFirst) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [me?.id]);

  // Debounced, same pattern as the feed's post search.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(1, query), 350);
    return () => clearTimeout(searchTimer.current);
  }, [query, runSearch]);

  const toggleFollow = async (target) => {
    setFollowBusyId(target._id);
    const wasFollowing = target.isFollowing;
    setResults((prev) =>
      prev.map((u) => (u._id === target._id ? { ...u, isFollowing: !wasFollowing } : u))
    );
    try {
      await api.put(`/user/${target._id}/${wasFollowing ? 'unfollow' : 'follow'}`);
    } catch (err) {
      // roll back on failure
      setResults((prev) =>
        prev.map((u) => (u._id === target._id ? { ...u, isFollowing: wasFollowing } : u))
      );
      setError(errorMessage(err, 'Could not update follow state'));
    } finally {
      setFollowBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Search people</h1>

      <GlassCard className="mb-5 p-4">
        <label className="sr-only" htmlFor="input-people-search">Search by username</label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg opacity-60">🔍</span>
          <input
            id="input-people-search"
            className="gl-input"
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0.4rem 0' }}
            placeholder="Search by username…"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="cursor-pointer text-sm opacity-60 transition-opacity hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>
      </GlassCard>

      {error && <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>}

      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <GlassCard key={i} className="flex items-center gap-3 p-4">
              <Skeleton style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div className="flex-1 space-y-2">
                <Skeleton style={{ height: 12, width: '35%' }} />
                <Skeleton style={{ height: 10, width: '20%' }} />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!loading && !query.trim() && (
        <GlassCard>
          <EmptyState icon="🔎" title="Find someone">
            Start typing a username to search for people.
          </EmptyState>
        </GlassCard>
      )}

      {!loading && query.trim() && !results.length && (
        <GlassCard>
          <EmptyState icon="🔍" title="No one matched">
            Nothing found for “{query.trim()}”. Try a different username.
          </EmptyState>
        </GlassCard>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((u) => (
            <GlassCard key={u._id} className="flex items-center gap-3 p-4">
              <Link to={`/profile/${u._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={u.pic} name={u.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {u.followers?.length ?? 0} followers
                  </p>
                </div>
              </Link>
              {u._id !== me?.id && (
                <Button
                  size="sm"
                  variant={u.isFollowing ? 'ghost' : 'primary'}
                  loading={followBusyId === u._id}
                  onClick={() => toggleFollow(u)}
                >
                  {u.isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" loading={loadingMore} onClick={() => runSearch(page + 1, query)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
