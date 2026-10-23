// app/api/auth/register/route.js
import crypto from 'node:crypto';
import { queryOne, run } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Format email gak valid.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
