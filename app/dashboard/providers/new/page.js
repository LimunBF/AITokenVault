'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/strings';
import { apiFetch } from '@/lib/api-client';
import { PendingStatus } from '@/components/PendingStatus';

const CATEGORIES = ['Chatbot', 'Image', 'Video', 'Audio', 'Coding', 'Lainnya'];

const inputCls =
  'mt-1 w-full rounded-xl border border-violet-500/25 bg-zinc-900/70 px-3 py-2 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:opacity-60';

export default function NewProviderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  // Token API opsional, langsung di form yang sama — gak perlu dua langkah.
  const [apiToken, setApiToken] = useState('');
  const [tokenLabel, setTokenLabel] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarning('');
    setTimedOut(false);
    setLoading(true);

    try {
      const tagArray = tags.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await apiFetch('/api/providers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          url,
          category: category || null,
          model: model || null,
          tags: tagArray,
          notes: notes || null,
        }),
      });
      const created = await res.json().catch(() => null);

      if (!res.ok || !created) {
        setError((created && created.error) || 'Gagal menambah provider.');
        setLoading(false);
        return;
      }

      // Provider kebuat. Kalau token diisi, simpan sekalian.
      if (apiToken.trim()) {
        const tokenRes = await apiFetch('/api/tokens', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: created.id,
            label: tokenLabel.trim() || 'Token Utama',
            token: apiToken.trim(),
            status: 'active',
          }),
        });

        if (!tokenRes.ok) {
          const body = await tokenRes.json().catch(() => null);
          // Provider tetap kebuat — jangan buang kerjaan user cuma karena token gagal.
          setWarning(`Provider kebuat, tapi token gagal disimpan: ${(body && body.error) || tokenRes.status}. Tambahin manual di halaman provider.`);
          setLoading(false);
          router.push(`/dashboard/providers/${created.id}`);
          return;
        }
      }

      // Ke halaman provider, bukan dashboard — biar user lihat hasilnya langsung.
      router.push(`/dashboard/providers/${created.id}`);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-4 py-8"
    >
      <h1 className="text-2xl font-bold">
        <span className="text-gradient">{t.addProvider}</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Isi detail provider AI lo. Token API bisa langsung ditempel di bawah (opsional).
      </p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </motion.div>
      )}

      {warning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-300"
        >
          {warning}
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
        onSubmit={handleSubmit}
        className="card-glass mt-6 space-y-4 rounded-3xl border border-violet-500/20 p-6 shadow-2xl shadow-violet-950/40"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerName}</label>
          <input
            type="text"
            required
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.providerNamePlaceholder}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerUrl}</label>
          <input
            type="url"
            required
            disabled={loading}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.providerUrlPlaceholder}
            className={inputCls}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300">{t.providerCategory}</label>
            <select
              value={category}
              disabled={loading}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">Pilih kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">{t.providerModel}</label>
            <input
              type="text"
              disabled={loading}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t.providerModelPlaceholder}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerTags}</label>
          <input
            type="text"
            disabled={loading}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t.providerTagsExample}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerNotes}</label>
          <textarea
            disabled={loading}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan bebas..."
            rows={2}
            className={inputCls}
          />
        </div>

        {/* Token API — opsional, di form yang sama */}
        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <p className="text-sm font-medium text-cyan-300">Token API (opsional)</p>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Tempel token di sini biar sekalian tersimpan. Dienkripsi AES-256-GCM sebelum masuk database.
            Boleh dikosongin — nanti bisa ditambah dari halaman provider.
          </p>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300">{t.tokenLabel}</label>
              <input
                type="text"
                disabled={loading}
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                placeholder={t.tokenLabelPlaceholder}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300">{t.tokenValue}</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  disabled={loading}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  className={`${inputCls} pr-11 font-mono`}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? t.hidePassword : t.showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 transition-colors hover:text-cyan-300 disabled:opacity-60"
                >
                  {showToken ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-600/60 px-5 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {t.cancel}
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-2.5 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:opacity-70"
          >
            {loading && (
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? t.connecting : t.save}
          </motion.button>
        </div>

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
      </motion.form>

      <p className="mt-4 text-center text-xs text-zinc-500">
        Mau nambah token ke provider yang udah ada? Buka{' '}
        <Link href="/dashboard" className="text-violet-400 hover:text-fuchsia-300">dashboard</Link>{' '}
        → pilih provider → {t.addToken}.
      </p>
    </motion.div>
  );
}
