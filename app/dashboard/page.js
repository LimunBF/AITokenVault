'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toaster';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ProviderCard } from '@/components/ProviderCard';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/lib/strings';
import { authFetch, SUPABASE_URL } from '@/lib/api';
import { withTimeout, isTimeoutError } from '@/lib/async-utils';
import { PendingStatus } from '@/components/PendingStatus';
import { useGuard } from '@/hooks/use-guard';

export default function DashboardPage() {
  const { user, profile, ready } = useGuard();
  const [providers, setProviders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState(null);
  const [loadError, setLoadError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!ready || !user) return;

    async function fetchData() {
      setLoading(true);
      setLoadError('');
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('providers')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          15000
        );

        if (error) {
          setLoadError(error.message || t.offline);
        } else {
          setProviders(data || []);
        }
      } catch (err) {
        setLoadError(isTimeoutError(err) ? t.serverTimeout : `${t.requestFailed} (${err.message})`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  // Filter providers by search + kategori
  useEffect(() => {
    let result = providers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => (p.category || 'Lainnya') === categoryFilter);
    }
    setFiltered(result);
  }, [providers, search, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set();
    providers.forEach((p) => cats.add(p.category || 'Lainnya'));
    return ['all', ...Array.from(cats)];
  }, [providers]);

  async function handleDelete() {
    if (!deletingProvider || !user) return;
    const res = await authFetch(`/api/providers/${deletingProvider.id}`, { method: 'DELETE' });
    if (res.ok) {
      setProviders((prev) => prev.filter((p) => p.id !== deletingProvider.id));
      toast.show('Provider berhasil dihapus.', 'success');
    } else {
      toast.show(t.offline, 'error');
    }
    setDeletingProvider(null);
    setShowDeleteModal(false);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-6 h-10 w-56 rounded-xl" />
        <SkeletonList count={3} />
      </div>
    );
  }

  const totalTokens = null; // ponytail: jumlah token belum dihitung — nanti kalau perlu statistik di dashboard.

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-8"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Hi{profile?.email ? ', ' : ''}
            <span className="text-gradient">{profile?.email || t.dashboardTitle}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t.dashboardSubtitle}</p>
        </div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/dashboard/providers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-shadow hover:shadow-violet-500/45"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.addProvider}
          </Link>
        </motion.div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-violet-500/20 bg-zinc-900/70 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded-xl border border-violet-500/20 bg-zinc-900/70 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 sm:w-auto"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Semua Kategori' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loadError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {loadError}
        </motion.div>
      )}

      {loading ? (
        <>
          <SkeletonList count={3} />
          <PendingStatus active serverUrl={SUPABASE_URL} />
        </>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState
            title={providers.length === 0 ? t.emptyProviders : 'Tidak ada hasil'}
            description={providers.length === 0 ? t.emptyProvidersDesc : 'Coba ubah filter pencarian lo.'}
            action={
              providers.length === 0 && (
                <Link
                  href="/dashboard/providers/new"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110"
                >
                  {t.addProvider}
                </Link>
              )
            }
          />
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hide"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {filtered.map((provider) => (
            <motion.div
              key={provider.id}
              variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 14 } }}
            >
              <ProviderCard
                provider={provider}
                onDelete={() => {
                  setDeletingProvider(provider);
                  setShowDeleteModal(true);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t.deleteProviderTitle}
        message={t.deleteConfirm}
        confirmText={t.yesDelete}
        danger
      />
    </motion.div>
  );
}
