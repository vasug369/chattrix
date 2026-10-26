import { NavLink } from 'react-router-dom';

/** Small coloured tag, matching the Pill component in Figma. */
export function Tag({ tone = 'neutral', children }) {
  const tones = {
    neutral: ['rgba(255,255,255,0.10)', 'var(--text-dim)'],
    accent: ['rgba(139,92,246,0.18)', '#c4b5fd'],
    danger: ['rgba(244,63,94,0.14)', '#fda4af'],
    warning: ['rgba(245,158,11,0.14)', '#fcd34d'],
    success: ['rgba(16,185,129,0.14)', '#6ee7b7'],
  };
  const [bg, fg] = tones[tone] ?? tones.neutral;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

const LINKS = [
  { to: '/admin', label: 'Reports', icon: '🚩', end: true },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/audit', label: 'Audit log', icon: '🧾' },
];

/**
 * Admin shell: a sidebar on desktop, a scrolling tab row on phones. The route
 * guard is only for UX; every /api/admin request is checked on the server.
 */
export function AdminLayout({ children }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <nav aria-label="Admin" className="glass-panel flex shrink-0 gap-1 overflow-x-auto p-2 md:w-56 md:flex-col md:self-start">
        <p className="hidden px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-widest md:block" style={{ color: 'var(--text-muted)' }}>
          Moderation
        </p>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'font-semibold' : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(139,92,246,0.18)' : undefined,
              color: isActive ? 'var(--text)' : 'var(--text-dim)',
            })}
          >
            <span aria-hidden="true">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Previous / next page controls for paginated admin lists. */
export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;
  return (
    <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" className="gl-btn gl-btn--ghost gl-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <button type="button" className="gl-btn gl-btn--ghost gl-btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
