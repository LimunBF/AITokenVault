'use client';

// hooks/use-guard.js — proteksi halaman. Return { user, profile, loading, ready }.
// - belum login         -> /login
// - pending/rejected    -> /login?reason=status (session server sudah gak valid)
// - requireAdmin & bukan admin -> /dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function useGuard({ requireAdmin = false } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.status !== 'active' || user.deleted_at) {
      router.replace('/login?reason=status');
      return;
    }

    if (requireAdmin && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [user, loading, requireAdmin, router]);

  return { user, profile: user, loading, ready };
}
