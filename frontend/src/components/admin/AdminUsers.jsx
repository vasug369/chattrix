import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { Avatar, Banner, Button, EmptyState, GlassCard, Skeleton } from '../ui/Glass';
import SuspendForm from './SuspendForm';
import { formatDate } from '../../lib/moderation';
import { AdminLayout, Pager, Tag } from './adminUi';

/** A4 · Search accounts; suspend or lift a suspension. */
export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [suspendingId, setSuspendingId] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/admin/users', { params: { status, page, ...(query ? { q: query } : {}) } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load users'));
      setData({ items: [] });
    }
  }, [status, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const unsuspend = async (id) => {
    setBusy(id);
    try {
      await api.post(`/admin/users/${id}/unsuspend`);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not lift the suspension'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Admins see email and status, never passwords or private messages.
        </p>
      </header>

      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <input className="gl-input" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <select
          className="gl-input sm:max-w-[160px]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="all">All accounts</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button type="submit" variant="ghost">Search</Button>
      </form>

      {error && <Banner tone="error">{error}</Banner>}

      {data === null ? (
        <Skeleton style={{ height: 240 }} />
      ) : !data.items.length ? (
        <GlassCard>
          <EmptyState icon="👥" title="No accounts found" />
        </GlassCard>
      ) : (
        <GlassCard className="p-2">
          <ul>
            {data.items.map((u) => (
              <li key={u._id} className="flex flex-col gap-3 rounded-xl p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar src={u.pic} name={u.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/profile/${u._id}`} className="block truncate text-sm font-semibold hover:underline">{u.name}</Link>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.email} · joined {formatDate(u.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.role === 'admin' && <Tag tone="accent">Admin</Tag>}
                    {!u.isAccountVerified && <Tag tone="warning">Unverified</Tag>}
                    {u.openReports > 0 && <Tag tone="danger">{u.openReports} open reports</Tag>}
                    {u.isSuspended ? <Tag tone="danger">Suspended</Tag> : <Tag>Active</Tag>}
                  </div>
                  {u.role !== 'admin' &&
                    (u.isSuspended ? (
                      <Button size="sm" variant="ghost" loading={busy === u._id} onClick={() => unsuspend(u._id)}>Lift</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setSuspendingId(u._id)}>Suspend…</Button>
                    ))}
                </div>
                {u.isSuspended && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Until {formatDate(u.suspendedUntil)} · {u.suspensionReason}
                  </p>
                )}
                {suspendingId === u._id && (
                  <SuspendForm
                    user={u}
                    onCancel={() => setSuspendingId(null)}
                    onDone={async () => {
                      setSuspendingId(null);
                      await load();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <Pager pagination={data?.pagination} onPage={setPage} />
    </AdminLayout>
  );
}
