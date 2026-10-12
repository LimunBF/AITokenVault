'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

// Proteksi halaman: redirect ke /login kalau belum login,
// ke /admin/users guard terpisah. Return { user, profile, loading, ready }.
export function useGuard({ requireAdmin = false } = {}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!profile || profile.status !== 'active' || profile.deleted_at) {
      supabaseSignOutThenLogin(router);
      return;
    }
    if (requireAdmin && profile.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    setReady(true);
  }, [user, profile, loading]);

  return { user, profile, loading, ready };
}

async function supabaseSignOutThenLogin(router) {
  const { supabase } = await import('@/lib/supabase');
  await supabase.auth.signOut();
  router.replace('/login?reason=status');
}
