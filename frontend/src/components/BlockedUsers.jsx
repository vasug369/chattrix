import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { Avatar, Banner, Button, EmptyState, GlassCard, Skeleton } from './ui/Glass';

/**
 * Settings › Blocked accounts: everyone the signed-in user has blocked, each
 * with an Unblock button. Blocking itself happens from a profile's ⋯ menu.
 */
export default function BlockedUsers() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  // Which row is mid-request, so only that button shows a spinner.
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/user/me/blocked');
      setUsers(data.items);
    } catch (err) {
      setError(errorMessage(err, 'Could not load blocked accounts'));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (id) => {
    setBusy(id);
    try {
      await api.put(`/user/${id}/unblock`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      setError(errorMessage(err, 'Could not unblock this account'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 animate-fade-in-up">
      <header>
        <h1 className="text-2xl font-bold">Blocked accounts</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Blocked people can’t see your profile or posts, message you, or follow you. They aren’t notified.
        </p>
      </header>

      {error && <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>}

      {users === null ? (
        <GlassCard className="flex flex-col gap-3 p-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <Skeleton style={{ height: 14, width: '40%' }} />
            </div>
          ))}
        </GlassCard>
      ) : users.length === 0 ? (
        <GlassCard>
          <EmptyState icon="🛡️" title="No one is blocked">
            You can block someone from the ⋯ menu on their profile.
          </EmptyState>
        </GlassCard>
      ) : (
        <GlassCard className="p-2">
          <ul>
            {users.map((u) => (
              <li key={u._id} className="flex items-center gap-3 rounded-xl p-3">
                <Avatar src={u.pic} name={u.name} size={40} />
                <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                <Button variant="ghost" size="sm" loading={busy === u._id} onClick={() => unblock(u._id)}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
