import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { Avatar, Banner, Button, GlassCard, Skeleton, TextArea } from '../ui/Glass';
import SuspendForm from './SuspendForm';
import { REASON_LABEL, TYPE_LABEL, formatDate, timeAgo } from '../../lib/moderation';
import { AdminLayout, Tag } from './adminUi';

/** A3 · One reported item: evidence, every report on it, the author, actions. */
export default function AdminReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const [suspending, setSuspending] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get(`/admin/reports/${id}`);
      setReport(data.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this report'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (action) => {
    setBusy(action);
    setError('');
    try {
      const { data } = await api.post(`/admin/reports/${id}/resolve`, { action, note: note.trim() });
      setNotice(
        action === 'remove'
          ? `Content removed. ${data.data.reportsClosed} report(s) closed.`
          : `Dismissed. ${data.data.reportsClosed} report(s) closed.`
      );
      setNote('');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update this report'));
    } finally {
      setBusy(null);
    }
  };

  const unsuspend = async () => {
    setBusy('unsuspend');
    try {
      await api.post(`/admin/users/${report.targetUser._id}/unsuspend`);
      setNotice('Suspension lifted.');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not lift the suspension'));
    } finally {
      setBusy(null);
    }
  };

  if (!report) {
    return (
      <AdminLayout>
        {error ? <Banner tone="error">{error}</Banner> : <Skeleton style={{ height: 320 }} />}
      </AdminLayout>
    );
  }

  const open = report.status === 'open';
  const u = report.targetUser;
  const noteOk = note.trim().length >= 3;

  return (
    <AdminLayout>
      <Link to="/admin" className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>← Reports</Link>

      <header className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{TYPE_LABEL[report.targetType]} report</h1>
        <Tag tone={open ? 'warning' : report.status === 'resolved' ? 'success' : 'neutral'}>
          {open ? 'Open' : report.status === 'resolved' ? 'Removed' : 'Dismissed'}
        </Tag>
        <Tag tone={report.reports.length >= 3 ? 'danger' : 'neutral'}>{report.reports.length} report(s)</Tag>
      </header>

      {notice && <Banner tone="success" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {error && <Banner tone="error" onDismiss={() => setError('')}>{error}</Banner>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold">Reported content</h2>
            <div className="rounded-xl p-4" style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.4)' }}>
              <p className="whitespace-pre-wrap break-words text-sm">{report.snapshot || '(no text)'}</p>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {report.contentExists ? 'Captured when first reported.' : 'This content has since been deleted; shown as captured.'}
              {report.targetType === 'message' && ' Messages are only visible to moderators once reported.'}
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold">Reports ({report.reports.length})</h2>
            <ul className="flex flex-col gap-3">
              {report.reports.map((r) => (
                <li key={r._id} className="flex gap-3">
                  <Avatar name={r.reporter?.name ?? '?'} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{r.reporter?.name ?? 'Deleted account'}</span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>· {REASON_LABEL[r.reason] ?? r.reason} · {timeAgo(r.createdAt)}</span>
                    </p>
                    {r.details && <p className="mt-0.5 text-sm" style={{ color: 'var(--text-dim)' }}>“{r.details}”</p>}
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-5">
          {u && (
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <Avatar src={u.pic} name={u.name} size={48} />
                <div className="min-w-0">
                  <Link to={`/profile/${u._id}`} className="block truncate font-semibold hover:underline">{u.name}</Link>
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                {[
                  ['Email verified', u.isAccountVerified ? <Tag tone="success">Yes</Tag> : <Tag tone="warning">No</Tag>],
                  ['Reports against (90 d)', <Tag key="r" tone={report.reportsAgainst90d >= 3 ? 'danger' : 'neutral'}>{report.reportsAgainst90d}</Tag>],
                  ['Past moderation actions', <Tag key="p" tone={report.pastActions ? 'warning' : 'neutral'}>{report.pastActions}</Tag>],
                  ['Joined', formatDate(u.createdAt)],
                  [
                    'Status',
                    u.isSuspended ? <Tag tone="danger">Suspended</Tag> : <Tag tone="neutral">Active</Tag>,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt style={{ color: 'var(--text-dim)' }}>{label}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              {u.isSuspended && (
                <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Until {formatDate(u.suspendedUntil)} · {u.suspensionReason}
                </p>
              )}
            </GlassCard>
          )}

          <GlassCard className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Actions</h2>
            {open ? (
              <>
                <TextArea
                  id="mod-note"
                  label="Moderator note (required)"
                  placeholder="Why you’re taking this action"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  style={{ minHeight: '4rem', resize: 'vertical' }}
                />
                {report.targetType !== 'user' && (
                  <Button variant="danger" loading={busy === 'remove'} disabled={!noteOk || !report.contentExists} onClick={() => resolve('remove')}>
                    Remove content
                  </Button>
                )}
                <Button variant="ghost" loading={busy === 'dismiss'} disabled={!noteOk} onClick={() => resolve('dismiss')}>
                  Dismiss: not a violation
                </Button>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                Closed {timeAgo(report.resolvedAt)}{report.note ? `: “${report.note}”` : ''}
              </p>
            )}

            {u && u.role !== 'admin' && (
              u.isSuspended ? (
                <Button variant="ghost" loading={busy === 'unsuspend'} onClick={unsuspend}>Lift suspension</Button>
              ) : suspending ? (
                <SuspendForm
                  user={u}
                  onCancel={() => setSuspending(false)}
                  onDone={async () => {
                    setSuspending(false);
                    setNotice(`${u.name} is suspended and signed out everywhere.`);
                    await load();
                  }}
                />
              ) : (
                <Button variant="danger" onClick={() => setSuspending(true)}>Suspend account…</Button>
              )
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Every action is written to the audit log.</p>
          </GlassCard>
        </div>
      </div>
    </AdminLayout>
  );
}
