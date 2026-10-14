'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(t.loginFailed);
      setLoading(false);
      return;
    }

    // Cek status profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, role, deleted_at')
      .eq('id', data.user.id)
      .maybeSingle();

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

    // status active — masuk dashboard
    router.push('/dashboard');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <h1 className="text-2xl font-bold text-white">{t.login}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t.tagline}</p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:!outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:!outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {loading ? t.loading : t.loginButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t.noAccount}{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300">
            {t.register}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
