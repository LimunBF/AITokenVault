'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';

export function TokenReveal({ token }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plaintext, setPlaintext] = useState('');

  async function handleReveal() {
    if (revealed) {
      setRevealed(false);
      setCopied(false);
      setPlaintext('');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/tokens/${token.id}`);
      if (!res.ok) throw new Error('gagal reveal');
      const data = await res.json();
      setPlaintext(data.token);
      setRevealed(true);
    } catch {
      setPlaintext('');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusLabel =
    token.status === 'active' ? t.statusActive
    : token.status === 'expired' ? t.statusExpired
    : t.statusOutOfQuota;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{token.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              token.status === 'active' ? 'bg-emerald-600/20 text-emerald-400'
              : token.status === 'expired' ? 'bg-amber-600/20 text-amber-400'
              : 'bg-red-600/20 text-red-400'
            }`}>
              {statusLabel}
            </span>
            {token.notes && (
              <p className="max-w-[220px] truncate text-xs text-zinc-500">{token.notes}</p>
            )}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={handleReveal}
            disabled={loading}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? t.loading : revealed ? t.hide : t.reveal}
          </button>
          <button
            onClick={copyToClipboard}
            disabled={!revealed}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              copied ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40'
            }`}
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      </div>
      {revealed && plaintext && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 break-all pb-6 font-mono text-sm text-emerald-400"
        >
          {plaintext}
        </motion.p>
      )}
    </div>
  );
}
