// scripts/check-security.mjs — uji serangan nyata ke API.
// Jalankan: set -a; source .env.local; set +a; node scripts/check-security.mjs
const B = process.env.BASE_URL || 'http://localhost:3000';
const MY = '"D:/laragon/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe" -u root';
const DB = process.env.DB_NAME || 'limunweb_cpuser_aitokenvault';
const sh = (c) => require('child_process').execSync(c, { encoding: 'utf8' });
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}

async function login(email, password) {
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const ck = r.headers.getSetCookie?.()[0]?.split(';')[0] || '';
  return { status: r.status, cookie: ck, body: await r.json().catch(() => null) };
}

async function makeUser(email, password, admin = false) {
  // Seed langsung ke DB, BUKAN lewat /api/auth/register: rate limit register
  // (5/jam per IP) akan memblokir test suite ini sendiri.
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  const role = admin ? 'admin' : 'user';
  sh(
    `${MY} ${DB} -e "INSERT INTO atv_users (id,email,password_hash,role,status,approved_at) ` +
      `VALUES ('${id}','${email}','${hash}','${role}','active',NOW()) ` +
      `ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), status='active', role='${role}'"`
  );
  return login(email, password);
}

// ── 1. SQL injection di login ────────────────────────────────
{
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "' OR '1'='1' -- ", password: 'x' }),
  });
  check('SQLi login ditolak', r.status === 401, `status ${r.status}`);
}

// ── 2. SQL injection di search param ─────────────────────────
{
  const u = await makeUser('sec_a@example.com', 'rahasia123');
  const r = await fetch(B + "/api/tokens?provider_id=' OR '1'='1", { headers: { Cookie: u.cookie } });
  check('SQLi query param gak error 500', r.status < 500, `status ${r.status}`);
}

// ── 3. XSS lewat javascript: URL provider ────────────────────
{
  const u = await makeUser('sec_b@example.com', 'rahasia123');
  const r = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: 'XSS Test', url: 'javascript:alert(document.cookie)' }),
  });
  const body = await r.json().catch(() => null);
  check('URL javascript: ditolak', r.status === 400, `status ${r.status}, url=${body?.url}`);
}

// ── 4. XSS lewat data: URL ───────────────────────────────────
{
  const u = await makeUser('sec_c@example.com', 'rahasia123');
  const r = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: 'XSS2', url: 'data:text/html,<script>alert(1)</script>' }),
  });
  check('URL data: ditolak', r.status === 400, `status ${r.status}`);
}

// ── 5. Kebocoran pesan error internal ────────────────────────
{
  const u = await makeUser('sec_d@example.com', 'rahasia123');
  const longLabel = 'x'.repeat(5000); // VARCHAR(255) → error DB
  const r = await fetch(B + '/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ provider_id: 'nonexistent-uuid', label: longLabel, token: 't' }),
  });
  const body = await r.json().catch(() => null);
  const msg = JSON.stringify(body || '');
  const leaks = /atv_|SELECT|INSERT|Data too long|ER_|sqlMessage|stack/i.test(msg);
  check('Error 500 gak bocorin detail DB', !leaks, msg.slice(0, 120));
}

// ── 6. Brute force login (rate limit) ────────────────────────
{
  const email = 'sec_e@example.com';
  await makeUser(email, 'rahasia123');
  let blocked = 0;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(B + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'salah' + i }),
    });
    if (r.status === 429) blocked++;
  }
  check('Login dibatasi setelah percobaan gagal berulang', blocked > 0, `${blocked}/12 diblokir`);
}

// ── 7. Register spam (rate limit) ────────────────────────────
{
  let blocked = 0;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(B + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `spam${i}@example.com`, password: 'rahasia123' }),
    });
    if (r.status === 429) blocked++;
  }
  check('Register dibatasi', blocked > 0, `${blocked}/10 diblokir`);
}

// ── 8. Security headers ──────────────────────────────────────
{
  const r = await fetch(B + '/login');
  const h = r.headers;
  const has = (k) => !!h.get(k);
  check('Header X-Frame-Options / CSP ada', has('x-frame-options') || has('content-security-policy'),
    `xfo=${h.get('x-frame-options')} csp=${h.get('content-security-policy') ? 'ada' : 'tidak'}`);
  check('Header X-Content-Type-Options ada', has('x-content-type-options'), `${h.get('x-content-type-options')}`);
  check('Header Referrer-Policy ada', has('referrer-policy'), `${h.get('referrer-policy')}`);
}

// ── 9. Cookie flags ──────────────────────────────────────────
{
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec_a@example.com', password: 'rahasia123' }),
  });
  const raw = r.headers.getSetCookie?.()[0] || '';
  check('Cookie HttpOnly', /HttpOnly/i.test(raw), raw.replace(/atv_session=[^;]+/, 'atv_session=<redacted>'));
  check('Cookie SameSite', /SameSite/i.test(raw), '');
  const isProd = process.env.NODE_ENV === 'production';
  check(
    'Cookie Secure ' + (isProd ? '(production: wajib)' : '(dev: boleh kosong)'),
    isProd ? /Secure/i.test(raw) : true,
    ''
  );
}

// ── 10. IDOR: user lain gak bisa akses provider ──────────────
{
  const a = await makeUser('idor_a@example.com', 'rahasia123');
  const b = await makeUser('idor_b@example.com', 'rahasia123');
  const p = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ name: 'Milik A', url: 'https://a.com' }),
  }).then((r) => r.json());

  const rGet = await fetch(B + `/api/providers/${p.id}`, { headers: { Cookie: b.cookie } });
  const rPut = await fetch(B + `/api/providers/${p.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
    body: JSON.stringify({ name: 'Dibajak' }),
  });
  const rDel = await fetch(B + `/api/providers/${p.id}`, { method: 'DELETE', headers: { Cookie: b.cookie } });
  check('IDOR: GET provider orang lain → 404', rGet.status === 404, `${rGet.status}`);
  check('IDOR: PUT provider orang lain → 404', rPut.status === 404, `${rPut.status}`);
  check('IDOR: DELETE provider orang lain → 404', rDel.status === 404, `${rDel.status}`);
}

// ── 11. IDOR token reveal ────────────────────────────────────
{
  const a = await makeUser('tok_a@example.com', 'rahasia123');
  const b = await makeUser('tok_b@example.com', 'rahasia123');
  const p = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ name: 'P', url: 'https://a.com' }),
  }).then((r) => r.json());
  const t = await fetch(B + '/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ provider_id: p.id, label: 'L', token: 'sk-rahasia-A' }),
  }).then((r) => r.json());

  const r = await fetch(B + `/api/tokens/${t.id}`, { headers: { Cookie: b.cookie } });
  check('IDOR: reveal token orang lain → 404', r.status === 404, `${r.status}`);

  // Token provider A dipasang ke provider B (harus ditolak)
  const p2 = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
    body: JSON.stringify({ name: 'P2', url: 'https://b.com' }),
  }).then((r) => r.json());
  const cross = await fetch(B + '/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
    body: JSON.stringify({ provider_id: p.id, label: 'L', token: 'x' }),
  });
  check('Token gak bisa dipasang ke provider orang lain', cross.status === 404, `${cross.status}`);
}

// ── 12. Escalation: user biasa akses admin ───────────────────
{
  const u = await makeUser('esc@example.com', 'rahasia123');
  const rGet = await fetch(B + '/api/admin/users', { headers: { Cookie: u.cookie } });
  const rPatch = await fetch(B + '/api/admin/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ user_id: 'x', action: 'approve' }),
  });
  check('User biasa gak bisa list admin', rGet.status === 401 || rGet.status === 403, `${rGet.status}`);
  check('User biasa gak bisa approve', rPatch.status === 401 || rPatch.status === 403, `${rPatch.status}`);
}

// ── 13. Akses tanpa login ────────────────────────────────────
{
  const routes = ['/api/providers', '/api/tokens', '/api/admin/users'];
  let allBlocked = true;
  for (const r of routes) {
    const res = await fetch(B + r);
    if (res.status !== 401) allBlocked = false;
  }
  check('Semua route data butuh login', allBlocked, '');
}

// ── 14. Session palsu / manipulasi cookie ────────────────────
{
  const r = await fetch(B + '/api/providers', {
    headers: { Cookie: 'atv_session=' + 'a'.repeat(64) },
  });
  check('Cookie session palsu ditolak', r.status === 401, `${r.status}`);
}

// ── 15. Mass assignment (field terlarang) ────────────────────
{
  const u = await makeUser('mass@example.com', 'rahasia123');
  const r = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: 'M', url: 'https://m.com', user_id: 'admin-id', id: 'custom-id' }),
  });
  const body = await r.json().catch(() => null);
  check('Mass assignment user_id ditolak', body?.user_id !== 'admin-id' && body?.id !== 'custom-id',
    `id=${body?.id}, user_id=${body?.user_id}`);
}

// ── 16. Prototype pollution ──────────────────────────────────
{
  const u = await makeUser('proto@example.com', 'rahasia123');
  const r = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: '{"name":"P","url":"https://p.com","__proto__":{"polluted":true}}',
  });
  const after = await fetch(B + '/api/providers', { headers: { Cookie: u.cookie } });
  const arr = await after.json().catch(() => null);
  check('Prototype pollution gak ngerusak response', Array.isArray(arr), typeof arr);
}

// ── 17. Oversized payload ────────────────────────────────────
{
  const u = await makeUser('big@example.com', 'rahasia123');
  const huge = 'A'.repeat(5 * 1024 * 1024);
  const r = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: 'Big', url: 'https://b.com', notes: huge }),
  });
  check('Payload 5MB ditolak', r.status === 413 || r.status === 400, `${r.status}`);
}

// ── 18. Enkripsi token di DB ─────────────────────────────────
{
  const u = await makeUser('enc@example.com', 'rahasia123');
  const p = await fetch(B + '/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: 'E', url: 'https://e.com' }),
  }).then((r) => r.json());
  const plain = 'sk-super-rahasia-123';
  const t = await fetch(B + '/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ provider_id: p.id, label: 'L', token: plain }),
  }).then((r) => r.json());

  const row = sh(`${MY} ${DB} -N -e "SELECT token_encrypted FROM atv_tokens WHERE id='${t.id}'"`).trim();
  check('Token gak disimpan plaintext', !row.includes(plain), `len=${row.length}`);
  check('Response API gak bocorin token', !JSON.stringify(t).includes(plain), '');
}

// ── 19. Timing attack pada login ─────────────────────────────
{
  await makeUser('timing@example.com', 'rahasia123');
  const t = async (email, pw) => {
    const s = Date.now();
    await fetch(B + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    });
    return Date.now() - s;
  };
  const a = [], b = [];
  for (let i = 0; i < 3; i++) {
    a.push(await t('timing@example.com', 'salah'));
    b.push(await t('tidakada@example.com', 'salah'));
  }
  const avg = (x) => x.reduce((p, c) => p + c, 0) / x.length;
  const diff = Math.abs(avg(a) - avg(b));
  check('Timing attack: user ada vs tidak ada gak beda jauh', diff < 200, `selisih ${Math.round(diff)}ms`);
}

// ── 20. Logout invalidasi session ────────────────────────────
{
  const u = await makeUser('logout@example.com', 'rahasia123');
  const before = await fetch(B + '/api/auth/me', { headers: { Cookie: u.cookie } });
  await fetch(B + '/api/auth/logout', { method: 'POST', headers: { Cookie: u.cookie } });
  const after = await fetch(B + '/api/auth/me', { headers: { Cookie: u.cookie } });
  const beforeBody = await before.json();
  const afterBody = await after.json();
  check('Logout cabut session', beforeBody.user && !afterBody.user, `${!!beforeBody.user} → ${!!afterBody.user}`);
}

console.log(`\n=== HASIL: ${pass} PASS, ${fail} FAIL ===`);
console.log(JSON.stringify(results.filter((r) => !r.ok).map((r) => r.name), null, 1));
process.exit(fail ? 1 : 0);
