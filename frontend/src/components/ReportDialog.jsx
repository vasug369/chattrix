import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { errorMessage } from '../lib/api';
import { REPORT_REASONS } from '../lib/moderation';
import { Banner, Button, TextArea } from './ui/Glass';

const NOUN = { post: 'post', comment: 'comment', message: 'message', user: 'account' };

/**
 * Report a post, comment, message or account.
 *
 * target: { type, id, postId?, name? }  (name: the person behind it)
 * onBlocked: called when the reporter also chose to block
 */
export default function ReportDialog({ target, onClose, onBlocked }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const firstOption = useRef(null);

  useEffect(() => {
    firstOption.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const who = target.name || 'this person';

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Choose a reason');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/reports', {
        targetType: target.type,
        targetId: target.id,
        ...(target.postId ? { postId: target.postId } : {}),
        reason,
        details: details.trim(),
        alsoBlock,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send your report'));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (sent && alsoBlock) onBlocked?.();
    onClose();
  };

  // Portalled to <body>: glass panels use backdrop-filter, which would trap a
  // fixed-position overlay inside the card that opened it.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(4,2,12,0.62)' }} onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="glass-panel relative max-h-[90vh] w-full max-w-md overflow-y-auto p-6 animate-scale-in"
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="text-4xl" aria-hidden="true">✅</div>
            <h2 id="report-title" className="text-lg font-semibold">Report sent</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Thanks for helping keep Chattrix safe. Our moderators review reports within 24 hours.
              {alsoBlock && ` You also blocked ${who}.`}
            </p>
            <Button onClick={close}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h2 id="report-title" className="text-lg font-semibold">Report this {NOUN[target.type]}</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Help us understand what’s wrong. {target.name ? `${target.name} won’t` : 'They won’t'} know it was you.
            </p>

            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map(([value, label], i) => {
                const on = reason === value;
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors"
                    style={{
                      background: on ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${on ? 'rgba(139,92,246,0.6)' : 'var(--glass-border)'}`,
                      color: on ? 'var(--text)' : 'var(--text-dim)',
                    }}
                  >
                    <input
                      ref={i === 0 ? firstOption : undefined}
                      type="radio"
                      name="report-reason"
                      value={value}
                      checked={on}
                      onChange={() => setReason(value)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {label}
                  </label>
                );
              })}
            </fieldset>

            <TextArea
              id="report-details"
              label="Details (optional)"
              placeholder="Anything that helps us review faster"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              style={{ minHeight: '4.5rem', resize: 'vertical' }}
            />

            <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: 'var(--text-dim)' }}>
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Also block {who}
            </label>

            {error && <Banner tone="error">{error}</Banner>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" loading={busy}>Submit report</Button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Reports go to our moderators, who act within 24 hours.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
