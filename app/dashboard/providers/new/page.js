'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/strings';

const CATEGORIES = ['Chatbot', 'Image', 'Video', 'Audio', 'Coding', 'Lainnya'];

const inputCls =
  'mt-1 w-full rounded-xl border border-violet-500/25 bg-zinc-900/70 px-3 py-2 text-white placeholder-zinc-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60';

export default function NewProviderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const tagArray = tags.split(',').map((s) => s.trim()).filter(Boolean);

    const { error: dbError } = await supabase.from('providers').insert({
      user_id: session.user.id,
      name,
      url,
      category: category || null,
      model: model || null,
      tags: tagArray,
      notes: notes || null,
    });

    setLoading(false);

    if (dbError) {
      setError(dbError.message || 'Gagal menambah provider');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-4 py-8"
    >
      <h1 className="text-2xl font-bold">
        <span className="text-gradient">{t.addProvider}</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Isi detail provider AI lo.</p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
        onSubmit={handleSubmit}
        className="card-glass mt-6 space-y-4 rounded-3xl border border-violet-500/20 p-6 shadow-2xl shadow-violet-950/40"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerName}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.providerNamePlaceholder}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerUrl}</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.providerUrlPlaceholder}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerCategory}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">Pilih kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerModel}</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t.providerModelPlaceholder}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerTags}</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t.providerTagsExample}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">{t.providerNotes}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan bebas..."
            rows={3}
            className={inputCls}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-600/60 px-5 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            {t.cancel}
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-2.5 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? t.loading : t.save}
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}
