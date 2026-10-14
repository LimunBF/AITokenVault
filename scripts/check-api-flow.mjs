// Self-check: jalur API (provider + token + enkripsi) end-to-end.
// Bikin user temp, approve, login, lalu hit API routes lewat dev server.
// Jalankan: node scripts/check-api-flow.mjs   (butuh `npm run dev` jalan)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const base = 'http://localhost:3000';
const admin = createClient(url, service, { auth: { persistSession:false } });

const email = `apitest+${Date.now()}@example.com`;
const password = 'apitest-Password-123';
let createdId = null;
let providerId = null;
let tokenId = null;
let failed = 0;
const ok = (label, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`); if (!cond) failed++; };

const SECRET = 'sk-test-abc123-SECRETVALUE-dontstoreplain';

try {
  const { data: c } = await admin.auth.admin.createUser({ email, password, email_confirm:true });
  createdId = c.user.id;
  await admin.from('profiles').update({ status:'active', approved_at:new Date().toISOString() }).eq('id', createdId);

  const userClient = createClient(url, anon, { auth: { persistSession:false } });
  const { data: s } = await userClient.auth.signInWithPassword({ email, password });
  const token = s.session.access_token;
  const H = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` };
  console.log('temp user:', email);

  // Tanpa auth -> 401
  const r401 = await fetch(`${base}/api/providers`);
  ok('tanpa auth = 401', r401.status === 401, `got ${r401.status}`);

  // Create provider
  const rp = await fetch(`${base}/api/providers`, { method:'POST', headers:H, body:JSON.stringify({ name:'Tes Provider', url:'https://tes.example.com', category:'Testing', tags:['a','b'] }) });
  const provider = await rp.json();
  providerId = provider.id;
  ok('POST provider = 201 + balikin row', rp.status === 201 && !!provider.id, `status ${rp.status}`);

  // Create token -> harus terenkripsi di DB
  const rt = await fetch(`${base}/api/tokens`, { method:'POST', headers:H, body:JSON.stringify({ provider_id:providerId, label:'Token Tes', token:SECRET, status:'active' }) });
  const tok = await rt.json();
  tokenId = tok.id;
  ok('POST token = 201', rt.status === 201 && !!tok.id, `status ${rt.status}`);
  ok('response POST tidak bocorin plaintext', JSON.stringify(tok).indexOf(SECRET) === -1);

  // DB harus simpan ciphertext, bukan plaintext
  const { data: row } = await admin.from('tokens').select('token_encrypted, token_iv').eq('id', tokenId).maybeSingle();
  ok('DB simpan ciphertext (bukan plaintext)', !!row?.token_encrypted && row.token_encrypted.indexOf(SECRET) === -1);
  ok('DB punya IV unik', !!row?.token_iv && row.token_iv.length > 8);

  // GET token -> reveal plaintext
  const rg = await fetch(`${base}/api/tokens/${tokenId}`, { headers:H });
  const revealed = await rg.json();
  ok('GET token = 200 + decrypt balik ke plaintext', rg.status === 200 && revealed.token === SECRET);

  // PATCH status
  const rpat = await fetch(`${base}/api/tokens/${tokenId}`, { method:'PATCH', headers:H, body:JSON.stringify({ status:'expired' }) });
  const patched = await rpat.json();
  ok("PATCH status -> 'expired'", rpat.status === 200 && patched.status === 'expired');

  // Token user lain gak boleh kebaca (402/404/401)
  const { data: c2 } = await admin.auth.admin.createUser({ email:`other+${Date.now()}@example.com`, password, email_confirm:true });
  const other = createClient(url, anon, { auth:{ persistSession:false } });
  const { data: s2 } = await other.auth.signInWithPassword({ email:c2.user.email, password });
  const rOther = await fetch(`${base}/api/tokens/${tokenId}`, { headers:{ Authorization:`Bearer ${s2.session.access_token}` } });
  ok('user lain gak bisa baca token ini', rOther.status !== 200, `got ${rOther.status}`);
  await admin.auth.admin.deleteUser(c2.user.id);

  // DELETE token + provider
  const rd = await fetch(`${base}/api/tokens/${tokenId}`, { method:'DELETE', headers:H });
  ok('DELETE token = 200', rd.status === 200, `got ${rd.status}`);
  tokenId = null;
  const rdp = await fetch(`${base}/api/providers/${providerId}`, { method:'DELETE', headers:H });
  ok('DELETE provider = 200', rdp.status === 200, `got ${rdp.status}`);
  providerId = null;
} catch (e) {
  console.log('FAIL  exception:', e.message);
  failed++;
} finally {
  if (tokenId) await admin.from('tokens').delete().eq('id', tokenId);
  if (providerId) await admin.from('providers').delete().eq('id', providerId);
  if (createdId) { await admin.from('profiles').delete().eq('id', createdId); await admin.auth.admin.deleteUser(createdId); }
  console.log('cleanup selesai');
  console.log(failed === 0 ? '\nSEMUA PASS' : `\n${failed} CHECK GAGAL`);
  process.exit(failed === 0 ? 0 : 1);
}
