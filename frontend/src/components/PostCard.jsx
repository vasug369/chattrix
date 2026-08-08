import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { Avatar, Button, GlassCard } from './ui/Glass';

const timeAgo = (iso) => {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
};

const flyingHeart = (e) => {
  const heart = document.createElement('div');
  heart.innerText = '❤️';
  heart.className = 'flying-heart';
  heart.style.left = `${e.clientX - 12}px`;
  heart.style.top = `${e.clientY - 20}px`;
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 1000);
};

/**
 * A single feed post.
 *
 * Extracted from the 561-line Dashboard so the feed, the profile grid and
 * search results can all render posts the same way.
 */
export default function PostCard({ post, currentUserId, onChange, onDelete, onError }) {
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: post.title, content: post.content });

  const author = post.author ?? {};
  const authorId = author._id ?? author;
  const isOwner = currentUserId && String(authorId) === String(currentUserId);
  const likes = post.likes ?? [];
  const liked = likes.some((id) => String(id) === String(currentUserId));

  const toggleLike = async (e) => {
    if (!liked) flyingHeart(e);
    // Optimistic: the like should feel instant. Reverted from the server
    // response if the request fails.
    const previous = likes;
    const next = liked
      ? likes.filter((id) => String(id) !== String(currentUserId))
      : [...likes, currentUserId];
    onChange({ ...post, likes: next });

    try {
      const { data } = await api.put(`/post/${post._id}/like`);
      onChange({ ...post, likes: data.data.likes });
    } catch (err) {
      onChange({ ...post, likes: previous });
      onError?.(errorMessage(err, 'Could not update your like'));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/post/${post._id}/comment`, { content: commentText });
      onChange(data.data);
      setCommentText('');
    } catch (err) {
      onError?.(errorMessage(err, 'Could not post your comment'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put(`/post/update/${post._id}`, draft);
      onChange(data.data);
      setEditing(false);
    } catch (err) {
      onError?.(errorMessage(err, 'Could not save your changes'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    // Kept as a confirm() because destroying a post is irreversible; the rest
    // of the app's alert()-based messaging is gone.
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.delete(`/post/${post._id}`);
      onDelete(post._id);
    } catch (err) {
      onError?.(errorMessage(err, 'Could not delete the post'));
      setBusy(false);
    }
  };

  const comments = post.comments ?? [];

  return (
    <GlassCard hover className="p-5 animate-fade-in-up sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <Link to={`/profile/${authorId}`}>
          <Avatar src={author.pic} name={author.name} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/profile/${authorId}`}
            className="block truncate font-semibold transition-opacity hover:opacity-80"
          >
            {author.name ?? 'Unknown user'}
          </Link>
          <time className="text-xs" style={{ color: 'var(--text-muted)' }} dateTime={post.createdAt}>
            {timeAgo(post.createdAt)}
            {post.updatedAt && ' · edited'}
          </time>
        </div>

        {isOwner && !editing && (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
              Delete
            </Button>
          </div>
        )}
      </header>

      {editing ? (
        /* Editing used to happen through window.prompt(), which cannot show
           validation errors and truncates long content. */
        <form onSubmit={saveEdit} className="mb-4 flex flex-col gap-3">
          <input
            className="gl-input"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            aria-label="Post title"
            required
          />
          <textarea
            className="gl-input"
            style={{ minHeight: '6rem', resize: 'vertical' }}
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            aria-label="Post content"
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy}>Save</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setDraft({ title: post.title, content: post.content });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-4">
          <h2 className="mb-1.5 text-lg font-semibold leading-snug">{post.title}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            {post.content}
          </p>
        </div>
      )}

      {post.pic && (
        <img
          src={post.pic}
          alt=""
          loading="lazy"
          className="mb-4 w-full rounded-xl object-cover"
          style={{ maxHeight: 420, border: '1px solid var(--glass-border)' }}
        />
      )}

      <footer
        className="flex items-center gap-2 pt-3"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        {/* One like toggle. There used to be a separate "Dislike" button that
            called the very same endpoint, so it silently removed your like. */}
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Remove like' : 'Like this post'}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-300 hover:bg-white/5"
          style={{ color: liked ? 'var(--danger)' : 'var(--text-dim)' }}
        >
          <span aria-hidden="true">{liked ? '❤️' : '🤍'}</span>
          {likes.length}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-300 hover:bg-white/5"
          style={{ color: 'var(--text-dim)' }}
        >
          <span aria-hidden="true">💬</span>
          {comments.length}
        </button>
      </footer>

      {showComments && (
        <div className="mt-4 animate-fade-in">
          <form onSubmit={submitComment} className="mb-3 flex gap-2">
            <input
              className="gl-input"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              aria-label="Write a comment"
            />
            <Button type="submit" size="sm" loading={busy} disabled={!commentText.trim()}>
              Post
            </Button>
          </form>

          {!comments.length ? (
            <p className="py-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No comments yet — be the first.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {comments.map((c, i) => (
                <li key={c._id ?? i} className="flex gap-2.5">
                  <Avatar name={c.name} size={30} />
                  <div
                    className="min-w-0 flex-1 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">{c.name ?? 'Someone'}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-sm" style={{ color: 'var(--text-dim)' }}>
                      {c.content}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </GlassCard>
  );
}
