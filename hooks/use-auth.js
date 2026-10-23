'use client';

// hooks/use-auth.js — sumber tunggal status login dari /api/auth/me.
// Gak ada Supabase: session ada di cookie HttpOnly, client cuma tau "siapa gue".
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

const AuthCtx = createContext({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me', { cache: 'no-store' });
      const body = await res.json();
      setUser(body.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // cookie bakal expire sendiri
    }
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // profile = alias user: nama field lama biar halaman gak perlu diubah semua.
  return (
    <AuthCtx.Provider value={{ user, profile: user, loading, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
