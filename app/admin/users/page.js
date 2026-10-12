'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGuard } from '@/hooks/use-guard';
import { useToast } from '@/components/Toaster';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/lib/strings';
import { authFetch } from '@/lib/api';

export default function AdminUsersPage() {
  const { user, profile, loading: authLoading } = useGuard({ requireAdmin: true });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;
    fetchUsers();
  }, [user, profile]);

  async function fetchUsers() {
    setLoading(true);
    const res = await authFetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    } else {
      toast.show('Gagal fetch users.', 'error');
    }
    setLoading(false);
  }

  async function handleUserAction(userId, action) {
    const res = await authFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action }),
    });
    if (res.ok) {
      if (action === 'approve') toast.show(t.approveSuccess, 'success');
      if (action === 'reject') toast.show(t.rejectSuccess, 'success');
      if (action === 'delete') toast.show(t.deleteUserSuccess, 'success');
      fetchUsers();
    } else {
      toast.show('Gagal memproses user.', 'error');
    }
  }

  async function softDelete(userId) {
    await handleUserAction(userId, 'delete');
    setShowDeleteModal(false);
    setDeletingUser(null);
  }

  if (authLoading || !user || profile?.role !== 'admin') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-8"
    >
      <h1 className="text-3xl font-bold text-white">{t.adminTitle}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.adminSubtitle}</p>

      {loading ? (
        <div className="mt-6"><p className="text-zinc-400">{t.loading}</p></div>
      ) : users.length === 0 ? (
        <EmptyState title={t.noPendingUsers} description="Semua user sudah diproses." />
      ) : (
        <motion.div className="mt-6 overflow-x-auto">
          <table className="w-full table-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 uppercase">{t.email}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 uppercase">{t.status}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-300 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-200">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === 'pending' ? 'bg-amber-600/20 text-amber-400'
                      : u.status === 'active' ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-red-600/20 text-red-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {u.status !== 'active' && (
                        <button
                          onClick={() => handleUserAction(u.id, 'approve')}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors"
                        >
                          {t.approved}
                        </button>
                      )}
                      {u.status === 'pending' && (
                        <button
                          onClick={() => handleUserAction(u.id, 'reject')}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500 transition-colors"
                        >
                          {t.reject}
                        </button>
                      )}
                      <button
                        onClick={() => { setDeletingUser(u); setShowDeleteModal(true); }}
                        className="rounded-lg border border-red-400/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
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