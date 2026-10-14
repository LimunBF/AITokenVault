'use client';

import { motion } from 'framer-motion';

// Skeleton loading untuk card provider & token list
export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-glass rounded-2xl border border-violet-500/15 p-5"
    >
      <div className="skeleton h-5 w-1/3 rounded" />
      <div className="skeleton mt-3 h-4 w-2/3 rounded" />
      <div className="skeleton mt-4 h-4 w-1/2 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </motion.div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
