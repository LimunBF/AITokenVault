'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toaster';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ProviderCard } from '@/components/ProviderCard';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';
import { useGuard } from '@/hooks/use-guard';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useGuard();
  const [providers, setProviders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!user || profile?.status !== 'active') return;

    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.show(t.offline, 'error');
      } else {
        setProviders(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [user, profile, toast]);

  // Filter providers by search
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

  if (authLoading || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{t.dashboardTitle}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t.dashboardSubtitle}</p>
        </div>
        <Link
          href="/dashboard/providers/new"
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
        >
          {t.addProvider}
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:!outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:!outline-none focus:ring-2 focus:ring-violet-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Semua Kategori' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={providers.length === 0 ? t.emptyProviders : 'Tidak ada hasil'}
          description={
            providers.length === 0 ? t.emptyProvidersDesc : 'Coba ubah filter pencarian lo.'
          }
          action={
            providers.length === 0 && (
              <Link href="/dashboard/providers/new" className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors">
                {t.addProvider}
              </Link>
            )
          }
        />
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hide"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {filtered.map((provider) => (
            <motion.div key={provider.id} variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 12 } }}>
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
