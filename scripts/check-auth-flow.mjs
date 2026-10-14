// Self-check: verifikasi jalur login yang tadi rusak.
// Bikin user sementara, login, baca profile sendiri via RLS (anon key + token user),
// lalu hapus user itu. Jalankan: node scripts/check-auth-flow.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession:false } });

const email = `selftest+${Date.now()}@example.com`;
const password = 'selftest-Password-123';
let createdId = null;
let failed = 0;
const ok = (label, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failed++; };

try {
  const { data: c, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm:true });
  if (ce) throw new Error(`createUser: ${ce.message}`);
  createdId = c.user.id;
  console.log('temp user:', email);

  // 1. Trigger harus auto-bikin row profiles dengan status 'pending'.
  const { data: p1 } = await admin.from('profiles').select('id,status,role').eq('id', createdId).maybeSingle();
  ok("trigger auto-buat profiles (status='pending')", p1?.status === 'pending');

  // 2. Login seperti dari browser (anon key) -> dapat access_token.
  const userClient = createClient(url, anon, { auth: { persistSession:false } });
  const { data: s, error: se } = await userClient.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn: ${se.message}`);
  ok('login dapat session', !!s.session?.access_token);

  // 3. Baca profile SENDIRI lewat RLS pakai token user (ini yang dipakai client).
  const { data: p2, error: pe } = await userClient.from('profiles').select('status, role').eq('id', createdId).maybeSingle();
  ok(`RLS: user baca profile sendiri (err=${pe?.message || 'none'})`, !pe && p2?.status === 'pending');

  // 4. Guard: status 'pending' HARUS ditolak, 'active' harus lolos.
  ok("guard nolak status 'pending'", p2?.status !== 'active');
  await admin.from('profiles').update({ status: 'active', approved_at: new Date().toISOString() }).eq('id', createdId);
  const { data: p3 } = await userClient.from('profiles').select('status').eq('id', createdId).maybeSingle();
  ok("guard lolos setelah approve (status='active')", p3?.status === 'active');

  // 5. User biasa TIDAK boleh naikin role sendiri (privilege escalation).
  await userClient.from('profiles').update({ role: 'admin' }).eq('id', createdId);
  const { data: p4 } = await admin.from('profiles').select('role').eq('id', createdId).maybeSingle();
  ok('RLS cegah user naikin role sendiri', p4?.role === 'user');

  // 6. User A tidak boleh lihat profile user lain.
  const { data: others } = await userClient.from('profiles').select('id');
  ok('RLS: cuma lihat profile sendiri', (others ||[]).every((r) => r.id === createdId));
} catch (e) {
  console.log('FAIL  exception:', e.message);
  failed++;
} finally {
  if (createdId) {
    await admin.from('profiles').delete().eq('id', createdId);
    await admin.auth.admin.deleteUser(createdId);
    console.log('temp user dihapus');
  }
  console.log(failed === 0 ? '\nSEMUA PASS' : `\n${failed} CHECK GAGAL`);
  process.exit(failed === 0 ? 0 : 1);
}
