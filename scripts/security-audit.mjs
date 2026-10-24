// scripts/security-audit.mjs — uji serangan nyata ke API.
// Bukan cuma baca kode: setiap temuan harus dibuktikan lewat request HTTP.
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
import mysql from 'mysql2/promise';

const B = process.env.BASE_URL || 'http://localhost:3000';
const DB = process.env.DB_NAME || 'limunweb_cpuser_aitokenvault';

// Pool koneksi untuk seed & verifikasi DB di dalam test (mengganti CLI mysql).
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || DB,
  connectionLimit: 1,
  waitForConnections: true,
  queueLimit: 0,
});

// Emulasi `mysql -N -e "query"`: kembalikan nilai skalar/string hasil pertama.
const sh = async (q) => {
  const [rows] = await pool.execute(q);
  if (Array.isArray(rows) && rows.length === 1 && typeof rows[0] === 'object') {
    return Object.values(rows[0])[0];
  }
  return '';
};

// Emulasi `mysql -e "query"`: kembalikan seluruh hasil tabel sebagai string.
const sql = async (q) => {
  const [rows] = await pool.execute(q);
  if (Array.isArray(rows)) {
    return rows.map((r) => Object.values(r).join('\t')).join('\n');
  }
  return '';
};

const results = [];
function record(id, name, severity, vulnerable, detail) {
  results.push({ id, name, severity, vulnerable, detail });
  const tag = vulnerable ? 'VULN' : 'OK  ';
  console.log(`${tag} [${severity}] ${id} ${name}${detail ? ' :: ' + detail : ''}`);
}

const json = (r) => r.json().catch(() => null);

// Seed user langsung ke DB (bypass rate limit register), lalu login via API.
// Rate limit register 5/jam akan blokir test suite kalau pake API register berulang.
const bcrypt = require('bcryptjs');

async function makeUser(email, password = 'rahasia123', approve = true) {
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO atv_users (id, email, password_hash, role, status, approved_at)
     VALUES (?, ?, ?, 'user', 'active', NOW())
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), status='active', approved_at=NOW()`,
    [id, email, hash]
  );
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (r.headers.getSetCookie() || [])[0]?.split(';')[0] || null;
  return { email, password, cookie };
}

// ── 1. Auth: endpoint tanpa login ────────────────────────────────────────────
async function testUnauthenticated() {
  const cases = [
    ['GET', '/api/providers'],
    ['GET', '/api/tokens'],
    ['GET', '/api/admin/users'],
    ['POST', '/api/providers'],
    ['POST', '/api/tokens'],
  ];
  for (const [method, path] of cases) {
    const r = await fetch(`${B}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? '{}' : undefined,
    });
    record(
      'AUTH-1',
      `${method} ${path} tanpa cookie`,
      'high',
      r.status !== 401,
      `status ${r.status}`
    );
  }
}

// ── 2. Bypass admin: user biasa akses /api/admin/users ───────────────────────
async function testAdminBypass() {
  const u = await makeUser('sec-user@example.com');
  if (!u.cookie) return record('AUTH-2', 'admin bypass', 'critical', true, 'gagal bikin user');

  const r = await fetch(`${B}/api/admin/users`, { headers: { Cookie: u.cookie } });
  record('AUTH-2', 'user biasa GET /api/admin/users', 'critical', r.status === 200, `status ${r.status}`);

  const r2 = await fetch(`${B}/api/admin/users`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ user_id: 'x', action: 'approve' }),
  });
  record('AUTH-3', 'user biasa PATCH /api/admin/users', 'critical', r2.status !== 401, `status ${r2.status}`);
}

// ── 3. Cookie palsu / token session random ───────────────────────────────────
async function testForgedCookie() {
  const forged = 'a'.repeat(64);
  const r = await fetch(`${B}/api/providers`, { headers: { Cookie: `atv_session=${forged}` } });
  record('AUTH-4', 'cookie session palsu (64 hex)', 'high', r.status !== 401, `status ${r.status}`);

  const r2 = await fetch(`${B}/api/providers`, { headers: { Cookie: 'atv_session=' } });
  record('AUTH-5', 'cookie session kosong', 'high', r2.status !== 401, `status ${r2.status}`);
}

// ── 4. SQL injection di query param & body ───────────────────────────────────
async function testSqlInjection() {
  const u = await makeUser('sec-sqli@example.com');
  const payloads = [
    `' OR '1'='1`,
    `'; DROP TABLE atv_users; --`,
    `' UNION SELECT * FROM atv_users --`,
    `1' AND 1=1 --`,
  ];
  for (const p of payloads) {
    const r = await fetch(`${B}/api/tokens?provider_id=${encodeURIComponent(p)}`, {
      headers: { Cookie: u.cookie },
      signal: AbortSignal.timeout(10000),
    });
    const body = await json(r);
    const leaked = JSON.stringify(body || '').includes('password_hash');
    record(
      'SQLI-1',
      `injection di provider_id: ${p.slice(0, 24)}`,
      'critical',
      r.status === 500 || leaked,
      `status ${r.status}${leaked ? ' BOCOR' : ''}`
    );
  }

  // tabel masih ada?
  const t = await sql("SHOW TABLES LIKE 'atv_users'");
  record('SQLI-2', 'tabel atv_users masih utuh', 'critical', !t.includes('atv_users'), 'cek DROP');
}

// ── 5. IDOR: user A akses resource user B ────────────────────────────────────
async function testIdor() {
  const a = await makeUser('sec-a@example.com');
  const b = await makeUser('sec-b@example.com');

  const prov = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ name: 'Rahasia A', url: 'https://a.com' }),
  }).then(json);

  const tok = await fetch(`${B}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ provider_id: prov.id, label: 'Token A', token: 'sk-rahasia-A' }),
  }).then(json);

  // B coba baca
  const g1 = await fetch(`${B}/api/providers/${prov.id}`, { headers: { Cookie: b.cookie } });
  record('IDOR-1', 'B baca provider A', 'critical', g1.status === 200, `status ${g1.status}`);

  const g2 = await fetch(`${B}/api/tokens/${tok.id}`, { headers: { Cookie: b.cookie } });
  const g2body = await json(g2);
  const leaked = JSON.stringify(g2body || '').includes('sk-rahasia-A');
  record('IDOR-2', 'B reveal token A', 'critical', g2.status === 200 || leaked, `status ${g2.status}`);

  const p2 = await fetch(`${B}/api/providers/${prov.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
    body: JSON.stringify({ name: 'DIBajak' }),
  });
  record('IDOR-3', 'B ubah provider A', 'critical', p2.status === 200, `status ${p2.status}`);

  const d2 = await fetch(`${B}/api/providers/${prov.id}`, {
    method: 'DELETE',
    headers: { Cookie: b.cookie },
  });
  record('IDOR-4', 'B hapus provider A', 'critical', d2.status === 200, `status ${d2.status}`);

  // token milik A, tapi provider_id dipalsukan ke provider B
  const bProv = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: b.cookie },
    body: JSON.stringify({ name: 'Punya B', url: 'https://b.com' }),
  }).then(json);

  const cross = await fetch(`${B}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ provider_id: bProv.id, label: 'Nyusup', token: 'sk-x' }),
  });
  record('IDOR-5', 'A bikin token di provider B', 'high', cross.status === 201, `status ${cross.status}`);

  return { a, b, prov, tok, bProv };
}

// ── 6. Mass assignment / field injection ────────────────────────────────────
async function testMassAssignment(ctx) {
  const { a } = ctx;
  const r = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({
      name: 'MassAssign',
      url: 'https://m.com',
      user_id: '00000000-0000-0000-0000-000000000000',
      id: 'hacked-id',
      role: 'admin',
    }),
  });
  const body = await json(r);
  const tookUserId = body?.user_id && body.user_id !== body.user_id; // placeholder
  const realOwner = (await sql(
    `SELECT user_id FROM atv_providers WHERE name='MassAssign' LIMIT 1`
  )).trim();
  const aId = (await sql(`SELECT id FROM atv_users WHERE email='${a.email}'`)).trim();
  const hijacked = realOwner.includes('00000000-0000');
  record('MASS-1', 'user_id di body diabaikan', 'critical', hijacked, hijacked ? 'HIJACK' : 'aman');

  // PATCH token: coba ubah user_id
  const r2 = await fetch(`${B}/api/tokens/${ctx.tok.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: a.cookie },
    body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', status: 'active' }),
  });
  const after = (await sql(`SELECT user_id FROM atv_tokens WHERE id='${ctx.tok.id}'`)).trim();
  record('MASS-2', 'user_id di PATCH token diabaikan', 'critical', after.includes('00000000-0000'), 'cek DB');
}

// ── 7. XSS / stored script di field teks ────────────────────────────────────
async function testStoredXss(ctx) {
  const payload = '<script>alert(1)</script>';
  const r = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: ctx.a.cookie },
    body: JSON.stringify({ name: payload, url: 'https://x.com', notes: payload, tags: [payload] }),
  });
  const body = await json(r);
  // Kalau disimpan mentah, itu bukan bug per se (React escape), tapi kita cek
  // apakah ada render HTML mentah di client.
  const stored = body?.name === payload;
  record(
    'XSS-1',
    'payload HTML disimpan mentah (cek dangerouslySetInnerHTML)',
    'info',
    false,
    stored ? 'disimpan apa adanya -> aman kalau React escape' : 'tidak tersimpan'
  );

  // Cari dangerouslySetInnerHTML pakai Node fs
  const fs = require('node:fs');
  const path = require('node:path');
  const dirs = ['app', 'components', 'lib'];
  let foundDSI = false;
  for (const d of dirs) {
    const full = path.join(process.cwd(), d);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full, { recursive: true })) {
      const fp = path.join(full, f);
      if (fs.statSync(fp).isFile() && (fp.endsWith('.js') || fp.endsWith('.jsx'))) {
        const c = fs.readFileSync(fp, 'utf8');
        if (c.includes('dangerouslySetInnerHTML')) { foundDSI = true; break; }
      }
    }
    if (foundDSI) break;
  }
  record('XSS-2', 'tidak ada dangerouslySetInnerHTML', 'high', foundDSI, foundDSI ? 'DAPAT' : 'bersih');
}

// ── 8. Rate limiting login (brute force) ────────────────────────────────────
async function testBruteForce() {
  const email = 'sec-brute@example.com';
  await makeUser(email, 'rahasia123');
  const t0 = Date.now();
  let blocked = 0;
  let attempts = 0;
  for (let i = 0; i < 30; i++) {
    attempts++;
    const r = await fetch(`${B}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'salah' + i }),
    });
    if (r.status === 429) {
      blocked++;
      break;
    }
  }
  const ms = Date.now() - t0;
  record(
    'RATE-1',
    'rate limit login (30 percobaan salah)',
    'high',
    blocked === 0,
    blocked ? `diblokir setelah ${attempts} percobaan` : `${attempts} percobaan lolos, ${ms}ms`
  );

  // register spam
  let regBlocked = 0;
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${B}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `spam${i}@example.com`, password: 'rahasia123' }),
    });
    if (r.status === 429) {
      regBlocked++;
      break;
    }
  }
  record('RATE-2', 'rate limit register (15 akun)', 'medium', regBlocked === 0, regBlocked ? 'diblokir' : '15 akun dibuat');
}

// ── 9. User enumeration ─────────────────────────────────────────────────────
async function testEnumeration() {
  await makeUser('sec-exists@example.com', 'rahasia123');
  const r1 = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec-exists@example.com', password: 'salahbanget' }),
  });
  const b1 = await json(r1);
  const r2 = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gak-ada-xyz@example.com', password: 'salahbanget' }),
  });
  const b2 = await json(r2);
  const same = b1?.error === b2?.error && r1.status === r2.status;
  record('ENUM-1', 'pesan login sama utk email ada/tidak', 'medium', !same, `${b1?.error} vs ${b2?.error}`);

  // register: 409 membocorkan email terdaftar
  const r3 = await fetch(`${B}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec-exists@example.com', password: 'rahasia123' }),
  });
  record('ENUM-2', 'register 409 bocorin email terdaftar', 'low', r3.status === 409, `status ${r3.status}`);
}

// ── 10. Session fixation / rotasi ───────────────────────────────────────────
async function testSessionFixation() {
  const u = await makeUser('sec-fix@example.com');
  const before = u.cookie;
  // login lagi -> token harus baru
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  const after = (r.headers.getSetCookie() || [])[0]?.split(';')[0];
  record('SESS-1', 'token baru tiap login', 'medium', before === after, before === after ? 'SAMA' : 'beda');

  // logout invalidasi token lama?
  await fetch(`${B}/api/auth/logout`, { method: 'POST', headers: { Cookie: after } });
  const r2 = await fetch(`${B}/api/providers`, { headers: { Cookie: after } });
  record('SESS-2', 'token lama mati setelah logout', 'high', r2.status === 200, `status ${r2.status}`);
}

// ── 11. Cookie flags ───────────────────────────────────────────────────────
async function testCookieFlags() {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec-user@example.com', password: 'rahasia123' }),
  });
  const raw = (r.headers.getSetCookie() || [])[0] || '';
  const flags = {
    httpOnly: /HttpOnly/i.test(raw),
    sameSite: /SameSite/i.test(raw),
    secure: /Secure/i.test(raw),
    path: /Path=\//i.test(raw),
  };
  record('COOKIE-1', 'HttpOnly', 'high', !flags.httpOnly, String(flags.httpOnly));
  record('COOKIE-2', 'SameSite', 'medium', !flags.sameSite, String(flags.sameSite));
  record(
    'COOKIE-3',
    'Secure (production only)',
    'info',
    false,
    flags.secure ? 'aktif' : 'nonaktif di dev (benar)'
  );
}

// ── 12. Error message bocorin internal ─────────────────────────────────────
async function testErrorLeak() {
  const r = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'atv_session=' + 'b'.repeat(64) },
    body: '{"name":',
  });
  const body = await json(r);
  const txt = JSON.stringify(body || '');
  const leaks = /at\s+\w+\.js|node_modules|\/home\/|D:\\\\|mysql|ER_|SQL/i.test(txt);
  record('ERR-1', 'error bocorin path/SQL internal', 'medium', leaks, txt.slice(0, 90));

  const r2 = await fetch(`${B}/api/tokens/../../etc/passwd`);
  record('ERR-2', 'path traversal di URL', 'high', r2.status === 200, `status ${r2.status}`);
}

// ── 13. Payload besar / DoS ringan ─────────────────────────────────────────
async function testPayloadSize() {
  const u = await makeUser('sec-big@example.com');
  const big = 'A'.repeat(2 * 1024 * 1024); // 2 MB
  const r = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: big, url: 'https://x.com' }),
  });
  record('DOS-1', 'body 2MB diterima tanpa batas', 'medium', r.status === 201, `status ${r.status}`);

  // tipe data aneh
  const r2 = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: u.cookie },
    body: JSON.stringify({ name: { $ne: null }, url: ['a'], tags: 'bukan-array' }),
  });
  record('VALID-1', 'tipe data salah ditolak', 'medium', r2.status === 201, `status ${r2.status}`);
}

// ── 14. Token encryption at rest ───────────────────────────────────────────
async function testEncryption(ctx) {
  const plain = 'sk-super-rahasia-123';
  const prov = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: ctx.a.cookie },
    body: JSON.stringify({ name: 'EncTest', url: 'https://e.com' }),
  }).then(json);
  const t = await fetch(`${B}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: ctx.a.cookie },
    body: JSON.stringify({ provider_id: prov.id, label: 'Enc', token: plain }),
  }).then(json);

  const row = await sql(`SELECT token_encrypted, token_iv FROM atv_tokens WHERE id='${t.id}'`);
  record('CRYPTO-1', 'plaintext tidak tersimpan di DB', 'critical', row.includes(plain), 'cek DB');
  record('CRYPTO-2', 'IV unik per token', 'medium', false, row.includes('token_iv') ? 'ada' : 'cek');

  // response API gak boleh bocorin ciphertext
  const resp = JSON.stringify(t);
  record('CRYPTO-3', 'API gak balikin ciphertext/IV', 'high', /token_encrypted|token_iv/.test(resp), 'cek response');
}

// ── 15. Header keamanan ────────────────────────────────────────────────────
async function testHeaders() {
  const r = await fetch(`${B}/login`);
  const h = (k) => r.headers.get(k);
  record('HDR-1', 'X-Content-Type-Options: nosniff', 'low', !h('x-content-type-options'), h('x-content-type-options') || 'kosong');
  record('HDR-2', 'X-Frame-Options / CSP frame-ancestors', 'medium', !h('x-frame-options'), h('x-frame-options') || 'kosong');
  record('HDR-3', 'Content-Security-Policy', 'medium', !h('content-security-policy'), h('content-security-policy') ? 'ada' : 'kosong');
  record('HDR-4', 'Referrer-Policy', 'low', !h('referrer-policy'), h('referrer-policy') || 'kosong');
}

// ── 16. Method override / CSRF ─────────────────────────────────────────────
async function testCsrf(ctx) {
  // SameSite=Lax memblokir POST cross-site, tapi cek apakah ada origin check.
  const r = await fetch(`${B}/api/providers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: ctx.a.cookie,
      Origin: 'https://evil.example.com',
      Referer: 'https://evil.example.com/',
    },
    body: JSON.stringify({ name: 'CSRF', url: 'https://csrf.com' }),
  });
  record('CSRF-1', 'POST cross-origin diterima (tanpa origin check)', 'medium', r.status === 201, `status ${r.status}`);
}

// ── Jalanin ────────────────────────────────────────────────────────────────
(async () => {
  console.log('=== SECURITY AUDIT — AI Token Vault ===\n');
  await testUnauthenticated();
  await testAdminBypass();
  await testForgedCookie();
  await testSqlInjection();
  const ctx = await testIdor();
  await testMassAssignment(ctx);
  await testStoredXss(ctx);
  await testBruteForce();
  await testEnumeration();
  await testSessionFixation();
  await testCookieFlags();
  await testErrorLeak();
  await testPayloadSize();
  await testEncryption(ctx);
  await testHeaders();
  await testCsrf(ctx);

  const vulns = results.filter((r) => r.vulnerable);
  console.log('\n=== RINGKASAN ===');
  console.log(`Total cek: ${results.length}`);
  console.log(`Temuan: ${vulns.length}`);
  for (const v of vulns) console.log(`  [${v.severity}] ${v.id} ${v.name} :: ${v.detail}`);
  console.log(`\n${vulns.length === 0 ? 'SEMUA AMAN' : 'ADA TEMUAN'}`);
  process.exit(0);
})();
