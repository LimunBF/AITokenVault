'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

// Proteksi halaman. Return { user, profile, loading, ready }.
// - belum login        -> /login
// - profile gak kebaca -> retry sekali, lalu /login?reason=profile
// - pending/rejected   -> sign out + /login?reason=status
// - requireAdmin & bukan admin -> /dashboard
export function useGuard({ requireAdmin = false } = {}) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!profile) {
      // Bisa race pas profile belum kebaca. Coba sekali lagi sebelum nyerah.
      if (!retried) {
        setRetried(true);
        refreshProfile();
        return;
      }
      router.replace('/login?reason=profile');
      return;
    }

    if (profile.deleted_at || profile.status === 'rejected' || profile.status !== 'active') {
      signOutThenLogin(router);
      return;
    }

    if (requireAdmin && profile.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [user, profile, loading, requireAdmin, retried, refreshProfile, router]);

  return { user, profile, loading, ready };
}

async function signOutThenLogin(router) {
  await supabase.auth.signOut();
  router.replace('/login?reason=status');
}
