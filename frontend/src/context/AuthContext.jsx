import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, pic, bio, isAccountVerified, following: [] }
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/api/user/me');
      setUser(res.data);
      setStatus('authenticated');
      return res.data;
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    await api.post('/api/auth/login', { email, password });
    return refreshUser();
  };

  const logout = async () => {
    await api.get('/api/auth/logout').catch(() => {});
    setUser(null);
    setStatus('unauthenticated');
  };

  const isFollowing = (userId) => Boolean(user?.following?.includes(userId));

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refreshUser, isFollowing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
