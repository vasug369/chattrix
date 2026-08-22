import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { Avatar, Button } from './ui/Glass';

const LINKS = [
  { to: '/dashboard', label: 'Feed', icon: '🏠' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/create-post', label: 'Create', icon: '✏️' },
  { to: '/messages', label: 'Messages', icon: '💬' },
  { to: '/profile', label: 'Profile', icon: '👤' },
  { to: '/sessions', label: 'Devices', icon: '🔒' },
];

/**
 * Shared top bar for authenticated pages.
 *
 * Each page previously rolled its own header with its own logout handler and
 * its own idea of the nav items, so the links differed between pages.
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  /**
   * `pop` is off for the mobile menu on purpose: those links are full-width
   * rows, and scaling one up 6% pushes it ~9px past each edge of a panel with
   * 8px of padding. The scale reads as a button growing; on a full-width row
   * it just looks like a layout glitch.
   *
   * No `transition-all duration-300` here either — it emits after .nav-pop at
   * equal specificity and overrode its timing. .nav-pop now declares every
   * transition it needs, including the colour and border changes for the
   * active state that transition-all used to cover.
   */
  const linkClass =
    (pop) =>
    ({ isActive }) =>
      [
        pop ? 'nav-pop' : 'transition-colors duration-200',
        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
        isActive ? 'text-white' : 'hover:text-white',
      ].join(' ');

  const linkStyle = ({ isActive }) => ({
    background: isActive ? 'rgba(139,92,246,0.18)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(139,92,246,0.4)' : 'transparent'}`,
    color: isActive ? 'var(--text)' : 'var(--text-dim)',
  });

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav className="glass-panel mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/favicon.svg"
            alt=""
            width="36"
            height="36"
            className="h-9 w-9 shrink-0"
            aria-hidden="true"
          />
          <span className="hidden text-lg font-bold sm:block gl-gradient-text">Chattrix</span>
        </NavLink>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass(true)} style={linkStyle}>
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="cursor-pointer"
            aria-label="Your profile"
          >
            <Avatar src={user?.pic} name={user?.name} size={38} />
          </button>

          <Button
            id="btn-logout"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden sm:inline-flex"
          >
            Sign out
          </Button>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl md:hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="glass-panel mx-auto mt-2 max-w-6xl p-2 md:hidden animate-scale-in">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={linkClass(false)}
              style={linkStyle}
            >
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="mt-2 w-full">
            Sign out
          </Button>
        </div>
      )}
    </header>
  );
}
