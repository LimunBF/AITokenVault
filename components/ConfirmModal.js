'use client';

import { motion, AnimatePresence } from 'framer-motion';

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Ya, Hapus', danger = true }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`card-glass w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              danger ? 'border-red-500/30 shadow-red-950/40' : 'border-violet-500/30 shadow-violet-950/40'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-600/60 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all ${
                  danger
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-900/40 hover:brightness-110'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-900/40 hover:brightness-110'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}