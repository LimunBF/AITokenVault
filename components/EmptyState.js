'use client';

import { motion } from 'framer-motion';

// Empty state dengan ilustrasi gradien + animasi float.
export function EmptyState({ icon = 'vault', title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass flex flex-col items-center justify-center rounded-3xl border border-dashed border-violet-500/30 px-6 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500/25 via-fuchsia-500/20 to-cyan-500/25 text-violet-300"
      >
        {icon === 'vault' ? (
          <svg width="44" height="44" viewBox="0 0 72 72" fill="none">
            <rect x="12" y="20" width="48" height="36" rx="8" stroke="currentColor" strokeWidth="3" />
            <circle cx="36" cy="38" r="9" stroke="currentColor" strokeWidth="3" />
            <path d="M36 33v10M31 38h10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M28 20v-7M44 20v-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="44" height="44" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="24" stroke="currentColor" strokeWidth="3" strokeDasharray="7 7" />
            <path d="M36 24v12l9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </motion.div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
