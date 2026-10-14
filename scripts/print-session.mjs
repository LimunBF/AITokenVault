// Bikin user temp yang sudah di-approve, login, lalu cetak session JSON.
// Dipakai buat inject session ke browser dan tes guard. Hapus user lagi setelahnya.
// Jalankan: node scripts/print-session.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false } });
const email = `guardtest+${Date.now()}@example.com`;
const password = 'guardtest-Password-123';

const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm:true });
await admin.from('profiles').update({ status:'active', approved_at:new Date().toISOString() }).eq('id', c.user.id);

const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession:false } });
const { data: s } = await anon.auth.signInWithPassword({ email, password });

console.log(JSON.stringify({ userId: c.user.id, email, projectRef: url.match(/https:\/\/([^.]+)/)[1], session: s.session }));
