'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';

export function Navbar() {
  const { user, profile } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500" />
          {t.appName}
        </Link>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link href="/login" className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white transition-colors">
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium hover:bg-violet-500 transition-colors"
              >
                {t.register}
              </Link>
            </>
          ) : (
            <>
              {profile?.role === 'admin' && (
                <Link href="/admin/users" className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white transition-colors">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white transition-colors">
                {t.dashboardTitle}
              </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
              >
                {t.logout}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}