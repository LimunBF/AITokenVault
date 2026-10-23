// lib/auth.js — auth sendiri: bcrypt + session token di cookie HttpOnly.
// Server-only. Session disimpan di tabel `sessions`, token acak 32 byte.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query, queryOne, run } from '@/lib/db';

const COOKIE = 'atv_session';
const SESSION_DAYS = 7;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await run(
    'INSERT INTO atv_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expires]
  );
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
  return token;
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await run('DELETE FROM atv_sessions WHERE token = ?', [token]);
  cookies().delete(COOKIE);
}

// Balikin user aktif (join profiles) atau null.
// Session kedaluwarsa / user di-soft-delete -> null.
export async function getSessionUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;

  return queryOne(
    `SELECT u.id, u.email, u.role, u.status, u.created_at, u.approved_at
       FROM atv_sessions s
       JOIN atv_users u ON u.id = s.user_id
      WHERE s.token = ?
        AND s.expires_at > UTC_TIMESTAMP()
        AND u.deleted_at IS NULL
      LIMIT 1`,
    [token]
  );
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
