'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastCtx = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let toastId = 0;

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                  toast.type === 'success'
                    ? 'bg-emerald-600 text-white'
                    : toast.type === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </ToastCtx.Provider>
  );
}