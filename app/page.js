'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { t } from '@/lib/strings';
import { useAuth } from '@/hooks/use-auth';

export default function Landing() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // User yang udah login & active langsung ke dashboard, gak nyangkut di welcome page.
  useEffect(() => {
    if (!loading && user && profile?.status === 'active' && !profile.deleted_at) {
      router.replace('/dashboard');
    }
  }, [loading, user, profile, router]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl px-4 py-16"
    >
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl"
        >
          {t.landingTitle}
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
          <Link
            href="/register"
            className="rounded-xl bg-violet-600 px-8 py-3 font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:bg-violet-500 hover:shadow-violet-500/40"
          >
            {t.getStarted}
            <svg
              className="ml-2 inline-block h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-8 py-3 font-semibold text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            {t.login}
          </Link>
        </motion.div>

        {/* Grid pattern backdrop */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(139,92,246,0.15), transparent 70%)',
          }}
        />
      </section>

      {/* Features */}
      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {[
          { icon: '🔐', title: t.featureSecure, desc: t.featureSecureDesc },
          { icon: '🗂️', title: t.featureOrganized, desc: t.featureOrganizedDesc },
          { icon: '📊', title: t.featureTrack, desc: t.featureTrackDesc },
        ].map((f) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
          </motion.div>
        ))}
      </section>
    </motion.main>
  );
}
