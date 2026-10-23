'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { t } from '@/lib/strings';
import { PasswordInput } from '@/components/PasswordInput';
import { PendingStatus } from '@/components/PendingStatus';
import { apiFetch } from '@/lib/api-client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = email && password.length >= 6 && password === confirm && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTimedOut(false);

    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error || t.registerFailed);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError(t.serverTimeout);
        setTimedOut(true);
      } else {
        setError(`${t.requestFailed} (${err.message})`);
      }
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10"
      >
        <div className="card-glass w-full max-w-md rounded-3xl border border-emerald-500/25 p-8 text-center shadow-2xl shadow-emerald-950/30">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-600/30">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Akun Terdaftar</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Akun lo masuk daftar tunggu. Admin perlu approve dulu sebelum lo bisa login.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110"
          >
            Ke Halaman Login
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
        <h1 className="text-center text-2xl font-bold">
          <span className="text-gradient">Buat Akun</span>
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-400">
          Daftar dulu, admin approve, baru bisa masuk.
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
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            {password.length > 0 && password.length < 6 && (
              <p className="mt-1 text-xs text-amber-400">{t.passwordTooShort}</p>
            )}
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
                disabled={loading}
              />
            </div>
            {mismatch && (
              <p className="mt-1 text-xs text-red-400">{t.passwordMismatch}</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-2.5 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading && (
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? t.connecting : t.registerButton}
          </motion.button>

          <PendingStatus active={loading} />

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
          {t.haveAccount}{' '}
          <Link href="/login" className="font-medium text-violet-400 hover:text-fuchsia-300">
            {t.login}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
