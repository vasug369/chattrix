import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

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

  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.get('/user/me');
      setUser(data.data);
      setStatus('authenticated');
      return data.data;
    } catch {
      setUser(null);
      setStatus('anonymous');
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
    });
  }, []);

  const login = useCallback(
    async (credentials) => {
      await api.post('/auth/login', credentials);
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
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      refresh: loadUser,
    }),
    [user, status, login, logout, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
