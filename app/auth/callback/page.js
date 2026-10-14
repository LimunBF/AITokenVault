'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Magic link / email confirmation mendarat di sini.
// supabase-js auto-baca token dari URL, jadi tinggal tunggu session lalu arahkan.
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let done =false;
    const go = (session) => {
      if (done) return;
      done =true;
      router.replace(session ? '/dashboard' : '/login?reason=link');
    };

    supabase.auth.getSession().then(({ data }) => go(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => go(s));
    // Jaring pengaman: kalau token gagal diproses, jangan gantung di halaman ini.
    const timer = setTimeout(() => go(null), 6000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <p className="text-zinc-400">Lagi masukin lo ke dashboard...</p>
    </div>
  );
}
