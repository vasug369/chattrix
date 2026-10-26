import { useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { Banner, Button, Field } from '../ui/Glass';

const DURATIONS = [
  [1, '24 hours'],
  [7, '7 days'],
  [30, '30 days'],
  [null, 'Permanent ban'],
];

/**
 * Suspend an account. Graduated: 24 h → 7 d → 30 d → ban. Suspension signs the
 * account out everywhere; the reason is shown to them when they try to sign in.
 */
export default function SuspendForm({ user, onDone, onCancel }) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/admin/users/${user._id}/suspend`, { days, reason: reason.trim() });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not suspend this account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl p-4 animate-fade-in"
      style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.35)' }}
    >
      <p className="font-semibold">Suspend {user.name}</p>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        They’re signed out everywhere and can’t sign in until it ends. Admins can’t be suspended.
      </p>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Duration</legend>
        {DURATIONS.map(([value, label]) => {
          const on = days === value;
          return (
            <label
              key={label}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{
                background: on ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${on ? 'rgba(139,92,246,0.6)' : 'var(--glass-border)'}`,
              }}
            >
              <input type="radio" name="suspend-days" checked={on} onChange={() => setDays(value)} style={{ accentColor: 'var(--accent)' }} />
              {label}
            </label>
          );
        })}
      </fieldset>
      <Field
        id="suspend-reason"
        label="Reason (shown to the user)"
        placeholder="e.g. Harassment, 2nd confirmed report"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        required
      />
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" loading={busy} disabled={reason.trim().length < 3}>
          Suspend
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
