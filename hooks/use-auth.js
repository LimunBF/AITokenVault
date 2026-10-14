'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCtx = createContext({ user: null, profile: null, loading: true });

async function fetchProfile(userId) {
  // maybeSingle: 0 row = null, bukan error (RLS bisa sembunyikan row).
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) return null;
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let seq = 0;

    // user & profile di-set BARENG setelah profile kebaca.
    // Kalau user di-set duluan, use-guard lihat profile null -> logout paksa (race).
    async function sync(session) {
      const mySeq = ++seq;
      const u = session?.user || null;
      const p = u ? await fetchProfile(u.id) : null;
      if (!active || mySeq !== seq) return;
      setUser(u);
      setProfile(p);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => sync(session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  }, [user]);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
