'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { t } from '@/lib/strings';

export function ProviderCard({ provider }) {
  return (
    <Link href={`/dashboard/providers/${provider.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="group block h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all hover:border-zinc-700"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
            <p className="mt-1 text-sm text-zinc-400 break-all">{provider.url}</p>
          </div>
          <span className="ml-3 inline-block rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-400">
            {provider.category || 'Lainnya'}
          </span>
        </div>

        {provider.model && (
          <p className="mt-2 text-xs text-zinc-500">Model: {provider.model}</p>
        )}

        {provider.tags && provider.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {provider.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
              >
                #{tag}
              </span>
            ))}
            {provider.tags.length > 3 && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                +{provider.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          whileHover={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          {provider.notes && (
            <p className="mt-3 line-clamp-2 text-xs text-zinc-400">{provider.notes}</p>
          )}
        </motion.div>
      </motion.div>
    </Link>
  );
}
