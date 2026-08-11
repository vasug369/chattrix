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
  const [onlineUsers, setOnlineUsers] = useState([]);
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
      setOnlineUsers([]);
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

    s.on('getOnlineUsers', setOnlineUsers);

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
      s.off('getOnlineUsers');
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
      isOnline: (id) => onlineUsers.includes(String(id)),
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
