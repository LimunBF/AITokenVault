'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useGuard } from '@/hooks/use-guard';
import { useToast } from '@/components/Toaster';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TokenReveal } from '@/components/TokenReveal';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';

export default function ProviderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useGuard();
  const [provider, setProvider] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [deleteToken, setDeleteToken] = useState(null);
  const toast = useToast();

  // Form token
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [tokenStatus, setTokenStatus] = useState('active');
  const [tokenNotes, setTokenNotes] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    if (!user || profile?.status !== 'active') return;

    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        router.replace('/dashboard');
        return;
      }

      setProvider(data);

      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('provider_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!tokenError) setTokens(tokenData || []);
      setLoading(false);
    }
    fetchData();
  }, [user, profile, id, router]);

  async function handleAddToken(e) {
    e.preventDefault();
    if (!tokenLabel || !tokenValue) return;

    setSavingToken(true);
    const res = await authFetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: id,
        label: tokenLabel,
        token: tokenValue,
        status: tokenStatus,
        notes: tokenNotes || null,
      }),
    });

    setSavingToken(false);

    if (res.ok) {
      const newToken = await res.json();
      setTokens((prev) => [newToken, ...prev]);
      setTokenLabel('');
      setTokenValue('');
      setTokenStatus('active');
      setTokenNotes('');
      setShowTokenModal(false);
      toast.show(t.addTokenSuccess, 'success');
    } else {
      const err = await res.json();
      toast.show(err.error || t.addTokenFailed, 'error');
    }
  }

  async function handleStatusChange(token, status) {
    const res = await authFetch(`/api/tokens/${token.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTokens((prev) => prev.map((tk) => (tk.id === token.id ? { ...tk, status } : tk)));
      toast.show(t.saved, 'success');
    } else {
      toast.show(t.offline, 'error');
    }
  }

  async function handleDeleteProvider() {
    if (!provider || !user) return;
    const res = await authFetch(`/api/providers/${provider.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.show('Provider berhasil dihapus.', 'success');
      router.replace('/dashboard');
    } else {
      toast.show(t.offline, 'error');
    }
    setShowDeleteModal(false);
  }

  async function handleDeleteToken() {
    if (!deleteToken) return;
    const res = await authFetch(`/api/tokens/${deleteToken.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTokens((prev) => prev.filter((tk) => tk.id !== deleteToken.id));
      toast.show('Token berhasil dihapus.', 'success');
    } else {
      toast.show(t.offline, 'error');
    }
    setDeleteToken(null);
  }

  if (authLoading || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl px-4 py-8"
    >
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t.back}
      </Link>

      {loading ? (
        <SkeletonList count={2} />
      ) : provider ? (
        <>
          {/* Provider header */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-bold text-white">{provider.name}</h1>
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-violet-400 hover:text-violet-300 break-all"
              >
                {provider.url}
              </a>
              {provider.category && (
                <span className="mt-3 inline-block rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-400">
                  {provider.category}
                </span>
              )}
              {provider.model && <p className="mt-2 text-sm text-zinc-400">Model: {provider.model}</p>}
              {provider.notes && <p className="mt-2 text-sm text-zinc-500">{provider.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>

          {/* Tags */}
          {provider.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {provider.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Tokens */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Token</h2>
              <button
                onClick={() => setShowTokenModal(true)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                {t.addToken}
              </button>
            </div>

            {tokens.length === 0 ? (
              <EmptyState
                icon="clock"
                title={t.emptyTokens}
                description={t.emptyTokensDesc}
                action={
                  <button
                    onClick={() => setShowTokenModal(true)}
                    className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
                  >
                    {t.addToken}
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {tokens.map((token) => (
                    <motion.div
                      key={token.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="group relative">
                        <TokenReveal token={token} />
                        <select
                          value={token.status}
                          onChange={(e) => handleStatusChange(token, e.target.value)}
                          className="absolute bottom-3 left-3 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:!outline-none"
                        >
                          <option value="active">{t.statusActive}</option>
                          <option value="expired">{t.statusExpired}</option>
                          <option value="out_of_quota">{t.statusOutOfQuota}</option>
                        </select>
                        <button
                          onClick={() => setDeleteToken(token)}
                          className="absolute right-3 bottom-3 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                          title={t.delete}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Delete provider modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProvider}
        title={t.deleteProviderTitle}
        message={t.deleteConfirm}
        confirmText={t.yesDelete}
        danger
      />

      {/* Delete token modal */}
      <ConfirmModal
        open={!!deleteToken}
        onClose={() => setDeleteToken(null)}
        onConfirm={handleDeleteToken}
        title={t.deleteTokenTitle}
        message={t.deleteTokenConfirm}
        confirmText={t.yesDelete}
        danger
      />

      {/* Add token modal */}
      <AnimatePresence>
        {showTokenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowTokenModal(false)}
          >
            <motion.form
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleAddToken}
            >
              <h3 className="text-lg font-semibold text-white">{t.addToken}</h3>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">{t.tokenLabel}</label>
                  <input
                    type="text"
                    required
                    value={tokenLabel}
                    onChange={(e) => setTokenLabel(e.target.value)}
                    placeholder={t.tokenLabelPlaceholder}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:!outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">{t.tokenValue}</label>
                  <input
                    type="text"
                    required
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    placeholder="sk-..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-white focus:!outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">{t.tokenStatus}</label>
                  <select
                    value={tokenStatus}
                    onChange={(e) => setTokenStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:!outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="active">{t.statusActive}</option>
                    <option value="expired">{t.statusExpired}</option>
                    <option value="out_of_quota">{t.statusOutOfQuota}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">{t.tokenNotes}</label>
                  <textarea
                    value={tokenNotes}
                    onChange={(e) => setTokenNotes(e.target.value)}
                    rows={2}
                    placeholder="Catatan..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:!outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingToken}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  {savingToken ? t.loading : t.saveToken}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}