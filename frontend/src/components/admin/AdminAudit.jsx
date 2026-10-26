import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { Banner, EmptyState, GlassCard, Skeleton } from '../ui/Glass';
import { formatDate } from '../../lib/moderation';
import { AdminLayout, Pager, Tag } from './adminUi';

const ACTION = {
  'report.removed': ['Removed content', 'danger'],
  'report.dismissed': ['Dismissed report', 'neutral'],
  'user.suspended': ['Suspended account', 'danger'],
  'user.unsuspended': ['Lifted suspension', 'success'],
};

/** A10 · Every moderation action, newest first. Append-only. */
export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/admin/audit', { params: { page } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the audit log'));
      setData({ items: [] });
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Who did what, and why. Entries can’t be edited or deleted.
        </p>
      </header>

      {error && <Banner tone="error">{error}</Banner>}

      {data === null ? (
        <Skeleton style={{ height: 240 }} />
      ) : !data.items.length ? (
        <GlassCard>
          <EmptyState icon="🧾" title="No actions yet">Moderation actions appear here as they happen.</EmptyState>
        </GlassCard>
      ) : (
        <GlassCard className="p-2">
          <ul>
            {data.items.map((a) => {
              const [label, tone] = ACTION[a.action] ?? [a.action, 'neutral'];
              return (
                <li key={a._id} className="flex flex-col gap-1 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <time className="shrink-0 text-xs tabular-nums sm:w-40" style={{ color: 'var(--text-muted)' }} dateTime={a.createdAt}>
                    {formatDate(a.createdAt)}
                  </time>
                  <div className="flex shrink-0 sm:w-44">
                    <Tag tone={tone}>{label}</Tag>
                  </div>
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{a.admin?.name ?? 'Admin'}</span>
                    {a.targetUser?.name && <span style={{ color: 'var(--text-dim)' }}> → {a.targetUser.name}</span>}
                    {a.note && <span style={{ color: 'var(--text-muted)' }}> · “{a.note}”</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}

      <Pager pagination={data?.pagination} onPage={setPage} />
    </AdminLayout>
  );
}
