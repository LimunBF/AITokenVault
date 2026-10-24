// app/api/auth/register/route.js
import crypto from 'node:crypto';
import { queryOne, run } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { rateLimit, tooManyRequests, clientIp, safeError, readJson, checkOrigin } from '@/lib/security';

// Batasi spam pendaftaran: 5 akun / jam per IP.
const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60_000;

export async function POST(request) {
  try {
    const origin = checkOrigin(request);
    if (!origin.ok) return Response.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    const ip = clientIp(request);
    const rl = rateLimit(`register:${ip}`, { max: MAX_REGISTRATIONS, windowMs: WINDOW_MS });
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const { email, password } = await readJson(request);

    if (!email || !password) {
      return Response.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return Response.json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
    }
    if (String(password).length > 200) {
      return Response.json({ error: 'Password maksimal 200 karakter.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || String(email).length > 255) {
      return Response.json({ error: 'Format email gak valid.' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM atv_users WHERE email = ?', [normalized]);
    if (existing) {
      return Response.json({ error: 'Email ini udah terdaftar.' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);

    await run(
      'INSERT INTO atv_users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [id, normalized, password_hash, 'user', 'pending']
    );

    return Response.json({ id, email: normalized, status: 'pending' }, { status: 201 });
  } catch (err) {
    return safeError(err, 'POST /api/auth/register');
  }
}
