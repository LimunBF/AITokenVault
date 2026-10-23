'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { t } from '@/lib/strings';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  const isAdmin = user && profile?.role === 'admin';

  return (
    <nav className="sticky top-0 z-40 border-b border-violet-500/20 bg-zinc-950/70 backdrop-blur-xl">
      {/* Garis gradien di atas navbar */}
      <div aria-hidden className="ring-gradient h-[2px] w-full" />

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5 font-bold text-lg">
          <motion.span
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-600/30"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
              <path d="M12 2.5 19.5 6v6c0 4.6-3.2 8.1-7.5 9.5C7.7 20.1 4.5 16.6 4.5 12V6Z" />
              <circle cx="12" cy="11" r="1.8" fill="#0a0a16" stroke="none" />
              <path d="M12 12.8v3" />
            </svg>
          </motion.span>
          <span className="text-gradient">{t.appName}</span>
        </Link>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname === '/login' ? 'text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-violet-500/40 hover:brightness-110"
              >
                {t.register}
              </Link>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    pathname.startsWith('/admin') ? 'text-cyan-300' : 'text-zinc-300 hover:text-cyan-300'
                  }`}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname.startsWith('/dashboard') ? 'text-violet-300' : 'text-zinc-300 hover:text-violet-300'
                }`}
              >
                {t.dashboardTitle}
              </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="rounded-lg border border-violet-500/30 px-4 py-1.5 text-sm transition-colors hover:bg-violet-500/15"
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
