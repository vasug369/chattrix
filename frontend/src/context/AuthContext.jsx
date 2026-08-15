import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Name of a purely client-side hint that this browser recently held a session.
 *
 * It is NOT an auth token and the server never reads it. The real credential is
 * an httpOnly cookie that JavaScript cannot see, which is exactly why this
 * exists: on a cold load the client has no way to guess whether it is signed in
 * without waiting for /user/me, and on Render's free tier that first request can
 * take ~10s while the instance boots.
 *
 * Forging it buys nothing — /user/me still 401s and the router still lands you
 * on the login form. All it decides is which loading state to paint meanwhile.
 */
const SESSION_HINT = 'chattrix.session';

const readHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    // Safari in private mode throws on localStorage access. Treating that as
    // "no hint" degrades to showing the login form, which is the safe default.
    return false;
  }
};

const writeHint = (value) => {
  try {
    if (value) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    /* see readHint */
  }
};

/**
 * Holds the signed-in user for the whole app.
 *
 * Every page previously hit `/api/auth/validate` on mount and kept its own
 * copy of the user, so a single navigation fired several redundant auth
 * requests and the pages could disagree about who was logged in.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  // Read once, at mount: the answer must describe how this page load started,
  // not follow the hint around as it changes.
  const [likelySignedIn] = useState(readHint);

  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.get('/user/me');
      setUser(data.data);
      setStatus('authenticated');
      writeHint(true);
      return data.data;
    } catch {
      setUser(null);
      setStatus('anonymous');
      writeHint(false);
      return null;
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // A 401 from anywhere in the app drops us back to anonymous, so the router
    // can redirect instead of leaving a half-broken authenticated view.
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
      // Leaving the hint set here would make the next cold load wait on a
      // spinner for a session we already know is gone.
      writeHint(false);
    });
  }, []);

  const login = useCallback(
    async (credentials) => {
      await api.post('/auth/login', credentials);
      return loadUser();
    },
    [loadUser]
  );

  /**
   * Exchange a Google credential for one of our sessions.
   *
   * Deliberately the same shape as login(): the server sets the same cookies
   * either way, so everything after this point is identical regardless of how
   * the user proved who they were.
   */
  const loginWithGoogle = useCallback(
    async (credential) => {
      await api.post('/auth/google', { credential });
      return loadUser();
    },
    [loadUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear locally even if the network call fails — otherwise a user who
      // has lost connectivity appears to stay signed in.
      setUser(null);
      setStatus('anonymous');
      writeHint(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      // True when this browser held a session on the previous visit. Public
      // pages use it to decide whether waiting is worth it; nothing is
      // authorised by it.
      likelySignedIn,
      login,
      loginWithGoogle,
      logout,
      refresh: loadUser,
    }),
    [user, status, likelySignedIn, login, loginWithGoogle, logout, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
