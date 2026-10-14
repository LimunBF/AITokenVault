'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { t } from '@/lib/strings';
import { useAuth } from '@/hooks/use-auth';

const FEATURES = [
  {
    title: t.featureSecure,
    desc: t.featureSecureDesc,
    gradient: 'from-violet-500 to-fuchsia-500',
    icon: (
      <path d="M12 2.5 19.5 6v6c0 4.6-3.2 8.1-7.5 9.5C7.7 20.1 4.5 16.6 4.5 12V6Z" />
    ),
  },
  {
    title: t.featureOrganized,
    desc: t.featureOrganizedDesc,
    gradient: 'from-cyan-400 to-blue-500',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    title: t.featureTrack,
    desc: t.featureTrackDesc,
    gradient: 'from-emerald-400 to-cyan-500',
    icon: (
      <>
        <path d="M3 17l5-6 4 4 5-7 4 5" />
        <circle cx="8" cy="11" r="1.4" fill="currentColor" />
      </>
    ),
  },
];

export default function Landing() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // User yang udah login & active langsung ke dashboard.
  useEffect(() => {
    if (!loading && user && profile?.status === 'active' && !profile.deleted_at) {
      router.replace('/dashboard');
    }
  }, [loading, user, profile, router]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 py-16"
    >
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-14 text-center">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Enkripsi AES-256-GCM
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl"
        >
          <span className="text-gradient">{t.landingTitle}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-zinc-400"
        >
          {t.landingCallToAction}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-600/35 transition-all hover:shadow-violet-500/50"
            >
              {t.getStarted}
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border border-violet-500/30 bg-zinc-900/50 px-8 py-3 font-semibold text-zinc-100 backdrop-blur transition-colors hover:bg-violet-500/15"
            >
              {t.login}
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once:true }}
            transition={{ delay: i * 0.12 }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="card-glass group relative overflow-hidden rounded-2xl border border-violet-500/15 p-6 transition-colors hover:border-violet-500/40"
          >
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {f.icon}
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
            {/* Glow pas hover */}
            <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${f.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30`} />
          </motion.div>
        ))}
      </section>
    </motion.main>
  );
}
