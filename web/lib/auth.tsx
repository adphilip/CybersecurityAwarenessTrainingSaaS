import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  // Load token from localStorage on first render
  useEffect(() => {
    const stored = globalThis.window === undefined ? null : localStorage.getItem('jwt_token');
    if (stored) setToken(stored);
  }, []);

  // Persist token to localStorage whenever it changes
  useEffect(() => {
    if (globalThis.window === undefined) return;
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  const updateToken = (value: string | null) => setToken(value);
  const logout = () => setToken(null);

  const value = useMemo(() => ({ token, setToken: updateToken, logout }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
