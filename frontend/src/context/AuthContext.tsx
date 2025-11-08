import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, login as apiLogin, logout as apiLogout } from '../api/client';
import { ApiHttpError } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof ApiHttpError && err.status === 401) {
        setError(null);
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // TODO: добавить exponential backoff при повторных попытках
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (name: string, password: string) => {
    try {
      setError(null);
      await apiLogin(name, password);
      await loadProfile();
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.payload?.msg ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось выполнить вход');
      }
      setLoading(false);
      throw err;
    }
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    login,
    logout,
    refresh: loadProfile,
  }), [user, loading, error, login, logout, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
