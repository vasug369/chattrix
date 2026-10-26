import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { Avatar, Banner, EmptyState, GlassCard, Skeleton } from '../ui/Glass';
import { REASON_LABEL, TYPE_LABEL, timeAgo } from '../../lib/moderation';
import { AdminLayout, Pager, Tag } from './adminUi';

const STATUSES = [
  ['open', 'Open'],
  ['resolved', 'Removed'],
  ['dismissed', 'Dismissed'],
];

/** A2 · Reports grouped by item, busiest first, then oldest. */
export default function AdminReports() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null);
    setError('');
    try {
      const res = await api.get('/admin/reports', { params: { status, page } });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load reports'));
      setData({ items: [] });
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Reports of the same item are grouped. Target: act on every report within 24 hours.
        </p>
      </header>

      <div role="tablist" aria-label="Report status" className="mb-4 inline-flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)' }}>
        {STATUSES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className="cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors"
            style={{
              background: status === value ? 'rgba(139,92,246,0.18)' : 'transparent',
              color: status === value ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: status === value ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      {data === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 76 }} />
          ))}
        </div>
      ) : !data.items.length ? (
        <GlassCard>
          <EmptyState icon="🛡️" title={status === 'open' ? 'Nothing to review' : 'No reports here'}>
            {status === 'open' ? 'New reports appear here as soon as they are filed.' : 'Closed reports are listed here.'}
          </EmptyState>
        </GlassCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((r) => (
            <li key={`${r.targetType}-${r.targetId}`}>
              <Link to={`/admin/reports/${r.reportId}`} className="block">
                <GlassCard hover className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Tag tone={r.count >= 3 ? 'danger' : r.count === 2 ? 'warning' : 'neutral'}>
                      {r.count} {r.count === 1 ? 'report' : 'reports'}
                    </Tag>
                    <Tag tone="accent">{TYPE_LABEL[r.targetType]}</Tag>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" style={{ color: 'var(--text-dim)' }}>
                      {r.snapshot || '(no text)'}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.reasons.map((x) => REASON_LABEL[x] ?? x).join(' · ')} · first {timeAgo(r.firstAt)}
                    </p>
                  </div>
                  {r.targetUser?.name && (
                    <div className="flex items-center gap-2">
                      <Avatar src={r.targetUser.pic} name={r.targetUser.name} size={28} />
                      <span className="text-sm">{r.targetUser.name}</span>
                    </div>
                  )}
                  <span className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>Review →</span>
                </GlassCard>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager pagination={data?.pagination} onPage={setPage} />
    </AdminLayout>
  );
}
