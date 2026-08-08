import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PostCard from './PostCard';
import { Avatar, Banner, Button, EmptyState, GlassCard, Skeleton } from './ui/Glass';

const PAGE_SIZE = 10;

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [suggested, setSuggested] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchTimer = useRef(null);

  const loadFeed = useCallback(async (pageNum = 1, query = '') => {
    const isFirst = pageNum === 1;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      // Search now runs server-side. The old page pulled the entire feed and
      // filtered it in the browser, so it could never match a post outside the
      // pages already loaded.
      const endpoint = query ? '/post/search' : '/post/feed';
      const params = query
        ? { q: query, page: pageNum, limit: PAGE_SIZE }
        : { page: pageNum, limit: PAGE_SIZE };

      const { data } = await api.get(endpoint, { params });
      setPosts((prev) => (isFirst ? data.items : [...prev, ...data.items]));
      setHasMore(data.pagination.page < data.pagination.pages);
      setPage(data.pagination.page);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your feed'));
      if (pageNum === 1) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1, '');
  }, [loadFeed]);

  // Debounced search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadFeed(1, search.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, loadFeed]);

  useEffect(() => {
    api
      .get('/user/getAllUsers', { params: { limit: 5 } })
      .then(({ data }) => setSuggested(data.items.filter((u) => u._id !== user?.id)))
      .catch(() => setSuggested([]));
  }, [user?.id]);

  const updatePost = (updated) =>
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

  const removePost = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section>
        <GlassCard className="mb-5 p-4">
          <label className="sr-only" htmlFor="input-search">Search posts</label>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg opacity-60">🔍</span>
            <input
              id="input-search"
              className="gl-input"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0.4rem 0' }}
              placeholder="Search posts by title or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
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
          <div className="flex flex-col gap-5">
            {[0, 1, 2].map((i) => (
              <GlassCard key={i} className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Skeleton style={{ width: 44, height: 44, borderRadius: '50%' }} />
                  <div className="flex-1 space-y-2">
                    <Skeleton style={{ height: 12, width: '35%' }} />
                    <Skeleton style={{ height: 10, width: '20%' }} />
                  </div>
                </div>
                <Skeleton style={{ height: 14, width: '65%', marginBottom: 10 }} />
                <Skeleton style={{ height: 10, width: '100%', marginBottom: 6 }} />
                <Skeleton style={{ height: 10, width: '85%' }} />
              </GlassCard>
            ))}
          </div>
        )}

        {!loading && !posts.length && (
          <GlassCard>
            {search ? (
              <EmptyState icon="🔍" title="No posts matched">
                Nothing found for “{search}”. Try a different phrase.
              </EmptyState>
            ) : (
              <EmptyState icon="🌱" title="Your feed is empty">
                Follow a few people, or write the first post yourself.
              </EmptyState>
            )}
          </GlassCard>
        )}

        {!loading && posts.length > 0 && (
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={user?.id}
                onChange={updatePost}
                onDelete={removePost}
                onError={setError}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              loading={loadingMore}
              onClick={() => loadFeed(page + 1, search.trim())}
            >
              Load more
            </Button>
          </div>
        )}
      </section>

      <aside className="hidden flex-col gap-5 lg:flex">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar src={user?.pic} name={user?.name} size={46} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
          </div>

          {user && !user.isAccountVerified && (
            <Banner tone="info">
              Your email isn&apos;t verified yet.{' '}
              <Link to="/verify-email" className="underline">Verify now</Link>
            </Banner>
          )}

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-lg font-bold">{user?.followerCount ?? 0}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Followers</p>
            </div>
            <div className="rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-lg font-bold">{user?.followingCount ?? 0}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Following</p>
            </div>
          </div>

          <Link to="/create-post" className="gl-btn mt-4 w-full">Write a post</Link>
        </GlassCard>

        {suggested.length > 0 && (
          <GlassCard className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Discover people</h2>
            <ul className="flex flex-col gap-3">
              {suggested.map((s) => (
                <li key={s._id}>
                  <Link
                    to={`/profile/${s._id}`}
                    className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/5"
                  >
                    <Avatar src={s.pic} name={s.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {s.followers?.length ?? 0} followers
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </aside>
    </div>
  );
}
