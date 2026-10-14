'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';
import { PasswordInput } from '@/components/PasswordInput';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validasi di trust boundary: cek lokal dulu sebelum hit Supabase.
    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      const msg = (signUpError.message || '').toLowerCase();
      if (msg.includes('rate limit') || signUpError.status === 429) setError(t.rateLimited);
      else setError(signUpError.message || t.registerFailed);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10"
      >
        <div className="card-glass w-full max-w-md rounded-3xl border border-emerald-500/30 p-8 text-center shadow-2xl shadow-emerald-950/40">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-600/40"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="text-xl font-bold text-white">Registrasi Berhasil</h1>
          <p className="mt-2 text-sm text-zinc-300">{t.pendingMessage}</p>
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            Penting: cek inbox email lo dan klik link konfirmasi. Kalau gak dikonfirmasi, login bakal ditolak walau admin udah approve.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110"
          >
            {t.login}
          </Link>
        </div>
      </motion.div>
    );
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
          <span className="animate-float inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-lg shadow-cyan-600/40">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold">
          <span className="text-gradient">Buat Akun Baru</span>
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-400">
          Admin approve dulu sebelum lo bisa masuk.
        </p>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-violet-500/25 bg-zinc-900/70 px-3 py-2 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60"
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
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-300">
              {t.confirmPassword}
            </label>
            <div className="mt-1">
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="Ulangi password"
              />
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="mt-1.5 text-xs text-amber-400">Password belum sama.</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 py-2.5 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? t.loading : t.registerButton}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t.haveAccount}{' '}
          <Link href="/login" className="font-medium text-violet-400 hover:text-fuchsia-300">
            {t.login}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
