// scripts/check-e2e.mjs — uji alur nyata ke server lokal.
// Prasyarat: `npm run dev` jalan, .env.local nunjuk ke DB test kosong.
const BASE = process.env.BASE_URL || 'http://localhost:3000';
let pass = 0, fail = 0;

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`PASS  ${name}${extra ? ' :: ' + extra : ''}`); }
  else { fail++; console.log(`FAIL  ${name}${extra ? ' :: ' + extra : ''}`); }
}

// Cookie jar minimal.
let cookie = '';
function jar(res) {
  const sc = res.headers.getSetCookie?.() || [];
  for (const c of sc) {
    const kv = c.split(';')[0];
    if (kv.startsWith('atv_session=')) {
      cookie = kv.endsWith('=') ? 'atv_session=' : kv;
    }
  }
}
async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
  });
  jar(res);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, res };
}

const email = `e2e${Date.now()}@example.com`;
const password = 'rahasia123';

// 1. health
let r = await call('/api/health');
ok('GET /api/health = 200', r.status === 200 && r.body.ok);

// 2. unauth
r = await call('/api/providers');
ok('tanpa login -> 401', r.status === 401);

// 3. register
r = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
ok('register = 201', r.status === 201, `status ${r.status}`);
ok('register default pending', r.body?.status === 'pending');

// 4. duplikat
r = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
ok('register email duplikat -> 409', r.status === 409, `status ${r.status}`);

// 5. login sebelum approve -> 403 pending
r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
ok('login pending -> 403', r.status === 403 && r.body?.code === 'pending', `status ${r.status}`);

// 6. password salah
r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'salahbanget' }) });
ok('password salah -> 401', r.status === 401);

console.log('\n--- approve via SQL, lalu login lagi ---');
const { execSync } = await import('node:child_process');
const DB = process.env.DB_NAME || 'limunweb_cpuser_aitokenvault';
const MYSQL = '"D:/xampp/mysql/bin/mysql.exe" -u root';
execSync(
  `${MYSQL} ${DB} -e "UPDATE atv_users SET status='active', role='admin', approved_at=NOW() WHERE email='${email}'"`,
  { stdio: 'pipe' }
);

r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
ok('login active -> 200', r.status === 200, `status ${r.status}`);
ok('cookie session diset', cookie.startsWith('atv_session=') && cookie.length > 20);

// 7. me
r = await call('/api/auth/me');
ok('GET /api/auth/me = user', r.status === 200 && r.body?.user?.email === email);

// 8. create provider
r = await call('/api/providers', {
  method: 'POST',
  body: JSON.stringify({ name: 'KiosAPI', url: 'https://kiosapi.com', category: 'Chatbot', tags: ['murah', 'api'] }),
});
ok('POST provider = 201', r.status === 201, `status ${r.status}`);
ok('tags balik sebagai array', Array.isArray(r.body?.tags) && r.body.tags.includes('murah'));
const providerId = r.body?.id;

// 9. list providers
r = await call('/api/providers');
ok('GET providers = 1', r.status === 200 && r.body.length === 1);

// 10. create token
const SECRET = 'sk-live-SUPERSECRET-12345';
r = await call('/api/tokens', {
  method: 'POST',
  body: JSON.stringify({ provider_id: providerId, label: 'Token Utama', token: SECRET }),
});
ok('POST token = 201', r.status === 201, `status ${r.status}`);
ok('response gak bocorin plaintext', !JSON.stringify(r.body).includes(SECRET));
ok('response gak bocorin ciphertext', !('token_encrypted' in (r.body || {})));
const tokenId = r.body?.id;

// 11. DB simpan ciphertext
const dbRow = execSync(
  `${MYSQL} ${DB} -N -e "SELECT token_encrypted, token_iv FROM atv_tokens WHERE id='${tokenId}'"`,
  { encoding: 'utf8' }
).trim().split('\t');
ok('DB simpan ciphertext (bukan plaintext)', !dbRow[0].includes(SECRET) && dbRow[0].length > 40);
ok('DB punya IV', dbRow[1] && dbRow[1].length > 10);

// 12. reveal decrypt
r = await call(`/api/tokens/${tokenId}`);
ok('reveal = plaintext asli', r.status === 200 && r.body?.token === SECRET);

// 13. patch status
r = await call(`/api/tokens/${tokenId}`, { method: 'PATCH', body: JSON.stringify({ status: 'expired' }) });
ok('PATCH status = expired', r.status === 200 && r.body?.status === 'expired');

// 14. admin list
r = await call('/api/admin/users');
ok('GET /api/admin/users = 200', r.status === 200 && Array.isArray(r.body));

// 15. cross-user isolation: daftar user kedua, login, coba akses token user 1
cookie = '';
const email2 = `e2e2${Date.now()}@example.com`;
await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: email2, password }) });
execSync(
  `${MYSQL} ${DB} -e "UPDATE atv_users SET status='active' WHERE email='${email2}'"`,
  { stdio: 'pipe' }
);
await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: email2, password }) });
r = await call(`/api/tokens/${tokenId}`);
ok('user lain gak bisa reveal token -> 404', r.status === 404, `status ${r.status}`);
r = await call(`/api/providers/${providerId}`);
ok('user lain gak bisa lihat provider -> 404', r.status === 404, `status ${r.status}`);

// 16. logout
r = await call('/api/auth/logout', { method: 'POST' });
ok('logout = 200', r.status === 200);
r = await call('/api/auth/me');
ok('setelah logout me = null', r.body?.user === null);

// 17. delete token & provider (login ulang sebagai user1)
await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
r = await call(`/api/tokens/${tokenId}`, { method: 'DELETE' });
ok('DELETE token = 200', r.status === 200);
r = await call(`/api/tokens/${tokenId}`);
ok('token terhapus -> 410', r.status === 410, `status ${r.status}`);
r = await call(`/api/providers/${providerId}`, { method: 'DELETE' });
ok('DELETE provider = 200', r.status === 200);

console.log(`\n${fail === 0 ? 'SEMUA PASS' : fail + ' GAGAL'} — pass ${pass}, fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);
