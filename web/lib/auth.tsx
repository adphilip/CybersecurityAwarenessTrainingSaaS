import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // Load token from localStorage on first render
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;
    if (stored) setTokenState(stored);
  }, []);

  // Persist token to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  const setToken = (value: string | null) => setTokenState(value);
  const logout = () => setTokenState(null);

  const value = useMemo(() => ({ token, setToken, logout }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
