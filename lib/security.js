// lib/security.js — proteksi: validasi URL, rate limit, error aman.
// Server-only.

// ── Validasi URL provider ────────────────────────────────────
// Cegah XSS lewat javascript:/data:/vbscript: yang dieksekusi saat <a href> diklik.
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export function safeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.includes(u.protocol)) return null;
  if (!u.hostname) return null;
  return u.toString();
}

// ── Error aman ───────────────────────────────────────────────
// Pesan internal (nama tabel, SQL, stack) TIDAK boleh sampai ke client.
// Detail asli tetap dicatat di server log.
export function safeError(err, context = '') {
  console.error(`[ERROR]${context ? ' ' + context : ''}:`, err?.message || err);

  // Error validasi dari kode sendiri (bukan DB) boleh diteruskan.
  if (err?.expose === true) {
    return Response.json({ error: err.message }, { status: err.status || 400 });
  }
  return Response.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
}

export function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

// ── Rate limit (in-memory, cukup untuk 1 proses Node di cPanel) ──
// ponytail: memory lokal — reset kalau app restart, dan gak sinkron antar
// worker. Untuk 1 proses Passenger ini cukup. Upgrade: tabel `atv_rate_limits`
// dengan kolom (key, count, reset_at) kalau nanti pakai >1 instance.
const buckets = new Map();

export function rateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  // Test suite bisa mematikan rate limit lewat env, biar E2E gak ngeblok diri sendiri.
  if (process.env.DISABLE_RATE_LIMIT === '1') return { ok: true, remaining: max };

  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  b.count++;
  if (b.count > max) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: max - b.count };
}

export function tooManyRequests(retryAfter = 60) {
  return Response.json(
    { error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

// IP client dari header proxy (cPanel/Passenger pakai X-Forwarded-For).
export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// ── CSRF protection ──────────────────────────────────────────
// SameSite=Lax melindungi cookie dari cross-site, tapi attacker masih bisa
// pakai <form action="https://viteklo.com/api/..." target="_top"> POST
// dengan credential. Cek Origin/Referer wajib untuk state-changing request.
export function checkOrigin(request) {
  if (process.env.DISABLE_RATE_LIMIT === '1') return { ok: true };
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const expected = process.env.NEXT_PUBLIC_APP_URL || '';
  if (expected) {
    // Production: Origin/Referer harus sama persis.
    const target = new URL(expected).origin;
    if (origin && !origin.startsWith(target)) return { ok: false };
    if (!origin && referer && !referer.startsWith(target)) return { ok: false };
  }
  return { ok: true };
}

// ── Batas ukuran body ────────────────────────────────────────
export const MAX_BODY_BYTES = 100 * 1024; // 100 KB cukup untuk semua form

export async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) {
    const err = new Error('Payload terlalu besar.');
    err.expose = true;
    err.status = 413;
    throw err;
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    const err = new Error('Payload terlalu besar.');
    err.expose = true;
    err.status = 413;
    throw err;
  }
  try {
    return JSON.parse(text || '{}');
  } catch {
    const err = new Error('Format JSON gak valid.');
    err.expose = true;
    err.status = 400;
    throw err;
  }
}
