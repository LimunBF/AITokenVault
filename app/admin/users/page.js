'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuard } from '@/hooks/use-guard';
import { useToast } from '@/components/Toaster';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';

const STATUS_STYLE = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function AdminUsersPage() {
  const { ready } = useGuard({ requireAdmin:true });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!ready) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function fetchUsers() {
    setLoading(true);
    const res = await authFetch('/api/admin/users');
    if (res.ok) {
      setUsers(await res.json());
    } else {
      toast.show('Gagal fetch users.', 'error');
    }
    setLoading(false);
  }

  async function handleUserAction(userId, action) {
    setBusyId(userId);
    const res = await authFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action }),
    });
    setBusyId(null);

    if (res.ok) {
      if (action === 'approve') toast.show(t.approveSuccess, 'success');
      if (action === 'reject') toast.show(t.rejectSuccess, 'success');
      if (action === 'delete') toast.show(t.deleteUserSuccess, 'success');
      fetchUsers();
    } else {
      const body = await res.json().catch(() => ({}));
      toast.show(body.error || 'Gagal memproses user.', 'error');
    }
  }

  async function softDelete(userId) {
    await handleUserAction(userId, 'delete');
    setShowDeleteModal(false);
    setDeletingUser(null);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton mb-6 h-10 w-56 rounded-xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">{t.adminTitle}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t.adminSubtitle}</p>
        </div>
        {pendingCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-300"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {pendingCount} nunggu approve
          </motion.span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title={t.noPendingUsers} description="Semua user sudah diproses." />
      ) : (
        <div className="card-glass overflow-hidden rounded-2xl border border-violet-500/20">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-violet-500/20 bg-violet-500/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">{t.email}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">{t.status}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map((u) => (
                  <motion.tr
                    key={u.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: busyId === u.id ? 0.5 : 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-b border-violet-500/10 transition-colors last:border-0 hover:bg-violet-500/5"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-200">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[u.status] || STATUS_STYLE.rejected}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {u.status !== 'active' && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={busyId === u.id}
                            onClick={() => handleUserAction(u.id, 'approve')}
                            className="rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-emerald-900/30 transition-all hover:brightness-110 disabled:opacity-50"
                          >
                            {t.approved}
                          </motion.button>
                        )}
                        {u.status === 'pending' && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={busyId === u.id}
                            onClick={() => handleUserAction(u.id, 'reject')}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                          >
                            {t.reject}
                          </motion.button>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={busyId === u.id}
                          onClick={() => { setDeletingUser(u); setShowDeleteModal(true); }}
                          className="rounded-lg border border-zinc-600/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                        >
                          {t.delete}
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => softDelete(deletingUser?.id)}
        title={t.deleteUserTitle}
        message={t.deleteUserConfirm}
        confirmText={t.yesDelete}
        danger
      />
    </motion.div>
  );
}
