'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { t } from '@/lib/strings';

// Warna badge kategori: deterministik dari nama kategori.
const PALETTE = [
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
];

function categoryStyle(cat) {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function ProviderCard({ provider, onDelete }) {
  const cat = provider.category || 'Lainnya';

  return (
    <div className="group relative h-full">
      {/* Border gradien animasi di atas kartu saat hover */}
      <div aria-hidden className="ring-gradient absolute inset-x-0 top-0 z-10 h-[2px] rounded-t-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <motion.div
        whileHover={{ scale: 1.02, y: -3 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="card-glass block h-full rounded-2xl border border-violet-500/15 p-5 transition-colors hover:border-violet-500/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/providers/${provider.id}`} className="block">
              <h3 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-violet-300">
                {provider.name}
              </h3>
            </Link>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-cyan-400/90 hover:text-cyan-300"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
                <path d="M15 3h6v6M10 14L21 3" strokeLinecap="round" />
              </svg>
              <span className="truncate">{provider.url}</span>
            </a>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryStyle(cat)}`}>
            {cat}
          </span>
        </div>

        {provider.model && (
          <p className="mt-2.5 inline-flex items-center gap-1 text-xs text-zinc-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M9 9h6v6H9z" />
            </svg>
            {provider.model}
          </p>
        )}

        {provider.tags && provider.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {provider.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-fuchsia-500/40 hover:text-fuchsia-300">
                #{tag}
              </span>
            ))}
            {provider.tags.length > 3 && (
              <span className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">
                +{provider.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {provider.notes && (
          <p className="mt-3 line-clamp-2 border-t border-violet-500/10 pt-3 text-xs text-zinc-500">{provider.notes}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`/dashboard/providers/${provider.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 transition-colors hover:text-fuchsia-300"
          >
            Buka
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            {t.delete}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
