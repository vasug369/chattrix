import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../lib/api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * One Socket.io connection for the whole app.
 *
 * The Messages page used to open its own socket against a hardcoded URL, so
 * notifications only arrived while that page happened to be mounted, and
 * navigating away silently dropped the connection.
 */
export function SocketProvider({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  // A Set, not an array: `isOnline` is called once per rendered avatar, and
  // Array.includes made that a scan of the whole online list per avatar.
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      // Tear down on sign-out, otherwise the previous user's socket keeps
      // receiving their events in the next session.
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setOnlineUsers(new Set());
      setUnreadNotifications(0);
      return undefined;
    }

    const s = io(SOCKET_URL, {
      query: { userId: user.id },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = s;
    setSocket(s);

    // The server sends the full list once, on connect, and then one id at a
    // time as people come and go — so this no longer receives a list sized by
    // however many people happen to be online on every single connect.
    s.on('presence:sync', (ids) => setOnlineUsers(new Set(ids.map(String))));

    // Deploy-order insurance. The frontend and the API ship on separate
    // pipelines, and Vercel is normally the faster of the two, so there is a
    // window where this build is live against an API that still only sends the
    // old full-list event. Without this the window renders as "nobody is
    // online". The new API also sends it, once, with the same ids as the
    // snapshot — so handling both is idempotent rather than conflicting.
    s.on('getOnlineUsers', (ids) => setOnlineUsers(new Set(ids.map(String))));

    s.on('presence:online', (id) =>
      setOnlineUsers((prev) => new Set(prev).add(String(id)))
    );

    s.on('presence:offline', (id) =>
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      })
    );

    // The server closes this socket when the session behind it is revoked from
    // another device. Without handling it, the page kept rendering as though
    // signed in until the user happened to navigate or reload — which is
    // exactly what made a remote sign-out look like it had not worked.
    s.on('session:revoked', () => {
      // logout() rather than setUser(null): `isAuthenticated` is derived from
      // `status`, not from `user`, so clearing the user alone would leave the
      // route guard thinking the session is still good. It also clears this
      // browser's now-useless cookies — /auth/logout is deliberately not behind
      // the auth middleware, so it still works with a dead session.
      s.disconnect();
      logout();
    });
    s.on('notification:new', (n) => setLatestNotification(n));
    s.on('notification:count', ({ unread }) => setUnreadNotifications(unread));

    return () => {
      s.off('presence:sync');
      s.off('getOnlineUsers');
      s.off('presence:online');
      s.off('presence:offline');
      s.off('session:revoked');
      s.off('notification:new');
      s.off('notification:count');
      s.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id, logout]);

  // Seed the badge on load; sockets only deliver changes from that point on.
  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setUnreadNotifications(data.data.unread))
      .catch(() => {});
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      socket,
      onlineUsers,
      isOnline: (id) => onlineUsers.has(String(id)),
      unreadNotifications,
      setUnreadNotifications,
      latestNotification,
    }),
    [socket, onlineUsers, unreadNotifications, latestNotification]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside a <SocketProvider>');
  return ctx;
}
