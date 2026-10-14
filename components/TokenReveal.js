'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';

const STATUS_STYLE = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  expired: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  out_of_quota: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function TokenReveal({ token }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [error, setError] = useState('');

  async function handleReveal() {
    if (revealed) {
      setRevealed(false);
      setCopied(false);
      setPlaintext('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/tokens/${token.id}`);
      if (!res.ok) {
        setError('Gagal ambil token. Coba login ulang.');
        return;
      }
      const data = await res.json();
      setPlaintext(data.token);
      setRevealed(true);
    } catch {
      setError('Gagal ambil token. Cek koneksi lo.');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Browser nolak akses clipboard.');
    }
  }

  const statusLabel =
    token.status === 'active' ? t.statusActive
    : token.status === 'expired' ? t.statusExpired
    : t.statusOutOfQuota;

  return (
    <motion.div
      layout
      className="card-glass rounded-2xl border border-violet-500/15 p-4 transition-colors hover:border-violet-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{token.label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[token.status] || STATUS_STYLE.active}`}>
              {statusLabel}
            </span>
            {token.notes && (
              <p className="max-w-[220px] truncate text-xs text-zinc-500">{token.notes}</p>
            )}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReveal}
            disabled={loading}
            className="rounded-lg border border-violet-500/30 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-violet-500/15 disabled:opacity-50"
          >
            {loading ? t.loading : revealed ? t.hide : t.reveal}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyToClipboard}
            disabled={!revealed}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              copied
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-900/30'
                : 'border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-40'
            }`}
          >
            {copied ? t.copied : t.copy}
          </motion.button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}

      {revealed && plaintext && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/25 px-3 py-2"
        >
          <p className="break-all pb-4 font-mono text-sm text-emerald-300">{plaintext}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
