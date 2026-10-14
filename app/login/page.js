'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';
import { PasswordInput } from '@/components/PasswordInput';
import { PendingStatus } from '@/components/PendingStatus';
import { SUPABASE_URL } from '@/lib/api';
import { withTimeout, isTimeoutError } from '@/lib/async-utils';

const AUTH_TIMEOUT_MS = 15000;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTimedOut(false);
    setLoading(true);

    try {
      // Batas waktu: kalau Supabase gak jawab dalam 15 detik, jangan nunggu selamanya.
      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS
      );

      if (authError) {
        const msg = (authError.message || '').toLowerCase();
        if (msg.includes('not confirmed')) setError(t.emailNotConfirmed);
        else if (msg.includes('rate limit') || authError.status === 429) setError(t.rateLimited);
        else setError(t.loginFailed);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .select('status, role, deleted_at')
          .eq('id', data.user.id)
          .maybeSingle(),
        AUTH_TIMEOUT_MS
      );

      if (profileError) {
        setError(`Gagal baca profile: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (!profile) {
        setError('Row profile gak ketemu di tabel profiles. Jalanin ulang query INSERT di SQL Editor.');
        setLoading(false);
        return;
      }

      if (profile.deleted_at || profile.status === 'rejected') {
        await supabase.auth.signOut();
        setError(t.rejectedMessage);
        setLoading(false);
        return;
      }

      if (profile.status === 'pending') {
        await supabase.auth.signOut();
        setError(t.pendingMessage);
        setLoading(false);
        return;
      }

      // status === 'active' -> gas masuk. loading sengaja dibiarkan nyala
      // sampai navigasi selesai, biar gak kedip balik ke bentuk awal.
      router.push('/dashboard');
    } catch (err) {
      if (isTimeoutError(err)) {
        setError(t.serverTimeout);
        setTimedOut(true);
      } else {
        setError(`${t.requestFailed} (${err.message})`);
      }
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="card-glass w-full max-w-md rounded-3xl border border-violet-500/20 p-8 shadow-2xl shadow-violet-950/50"
      >
        <div className="mb-6 flex justify-center">
          <span className="animate-float inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-600/40">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
              <path d="M12 2.5 19.5 6v6c0 4.6-3.2 8.1-7.5 9.5C7.7 20.1 4.5 16.6 4.5 12V6Z" />
              <circle cx="12" cy="11" r="1.8" fill="#0a0a16" stroke="none" />
              <path d="M12 12.8v3" />
            </svg>
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold">
          <span className="text-gradient">Selamat Datang Lagi</span>
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-400">{t.tagline}</p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-violet-500/25 bg-zinc-900/70 px-3 py-2 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:opacity-60"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              {t.password}
            </label>
            <div className="mt-1">
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-2.5 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:opacity-70"
          >
            {loading && (
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? t.connecting : t.loginButton}
          </motion.button>

          {/* Detik berjalan + status koneksi, biar gak terkesan nge-freeze */}
          <PendingStatus active={loading} serverUrl={SUPABASE_URL} />

          {timedOut && (
            <button
              type="button"
              onClick={() => { setError(''); setTimedOut(false); }}
              className="w-full rounded-xl border border-amber-500/40 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/15"
            >
              Coba Lagi
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t.noAccount}{' '}
          <Link href="/register" className="font-medium text-violet-400 hover:text-fuchsia-300">
            {t.register}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
