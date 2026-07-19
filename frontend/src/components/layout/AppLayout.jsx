import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const navItems = [
  { icon: '🏠', label: 'Home', path: '/dashboard' },
  { icon: '✍️', label: 'Create Post', path: '/create-post' },
  { icon: '🔍', label: 'Find People', path: '/search' },
  { icon: '💬', label: 'Messages', path: '/messages' },
  { icon: '🔔', label: 'Notifications', path: '/notifications' },
  { icon: '👤', label: 'Profile', path: '/profile' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

function Avatar({ user, size = 10 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const px = `${size * 4}px`;
  const showImage = user?.pic && user.pic.includes('http') && !imgFailed;

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
      style={{ width: px, height: px, background: 'var(--accent-gradient)', fontSize: `${size * 1.4}px` }}
    >
      {showImage ? (
        <img src={user.pic} alt={user.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
      ) : (
        user?.name?.charAt(0)?.toUpperCase() || '?'
      )}
    </div>
  );
}

export default function AppLayout({ activePath, children, headerExtra, rightRail }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = () => {
      api.get('/api/notifications/unread-count')
        .then((res) => { if (!cancelled) setUnreadCount(res.data.count); })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activePath]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      showToast('Failed to log out', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>

        <button
          className="lg:hidden text-2xl cursor-pointer bg-transparent border-none"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          ☰
        </button>

        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <span className="text-xl" aria-hidden="true">💬</span>
          <h1 className="hidden sm:block text-lg sm:text-xl font-bold font-poppins" style={{ color: 'var(--text-primary)' }}>
            Chattrix
          </h1>
        </div>

        <div className="flex-1 flex justify-center min-w-0">
          {headerExtra && <div className="w-full max-w-sm">{headerExtra}</div>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{ background: activePath === '/notifications' ? 'var(--bg-card-hover)' : 'transparent', border: '1px solid var(--border-color)' }}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <span className="text-base" aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: 'var(--danger)' }} aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => navigate('/profile')} className="cursor-pointer bg-transparent border-none p-0" aria-label="My profile">
            <Avatar user={user} size={9} />
          </button>

          <button
            onClick={handleLogout}
            className="hidden sm:block h-9 px-4 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.25)' }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`fixed lg:sticky top-0 lg:top-[65px] left-0 z-50 lg:z-10 w-64 lg:w-56 h-full lg:h-[calc(100vh-65px)] p-6 flex flex-col gap-2 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
          <button
            className="lg:hidden self-end text-xl mb-2 cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>

          <button
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
            className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl cursor-pointer bg-transparent border-none text-left transition-all duration-200"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <Avatar user={user} size={10} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>View profile</p>
            </div>
          </button>

          <p className="text-xs font-semibold uppercase tracking-widest mb-1 px-1" style={{ color: 'var(--text-muted)' }}>
            Menu
          </p>

          {navItems.map((item) => {
            const active = activePath === item.path;
            return (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className="relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 w-full text-left bg-transparent border-none"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', background: active ? 'var(--bg-card-hover)' : 'transparent' }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                    style={{ background: 'var(--accent-gradient)' }}
                    aria-hidden="true"
                  />
                )}
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--danger)' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            className="sm:hidden mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 w-full text-left"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.25)' }}
          >
            <span className="text-lg" aria-hidden="true">🚪</span>
            Logout
          </button>
        </aside>

        <main className={`min-w-0 flex-1 ${rightRail ? 'xl:flex xl:gap-0' : ''}`}>
          <div className={rightRail ? 'flex-1 min-w-0' : ''}>{children}</div>
          {rightRail && (
            <aside className="hidden xl:block w-80 shrink-0 py-8 pr-6">
              <div className="sticky top-[85px] flex flex-col gap-5">{rightRail}</div>
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}

export { Avatar };
