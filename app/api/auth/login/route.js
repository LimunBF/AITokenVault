// app/api/auth/login/route.js
// Status-driven: pending/rejected ditolak dengan pesan jelas, active langsung masuk.
import { queryOne } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();
    const user = await queryOne(
      'SELECT id, email, password_hash, role, status, deleted_at FROM atv_users WHERE email = ? LIMIT 1',
      [normalized]
    );

    // Pesan sama untuk "user gak ada" dan "password salah" — jangan bocorin mana yang salah.
    const fail = Response.json({ error: 'Email atau password salah.' }, { status: 401 });
    if (!user || user.deleted_at) return fail;

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return fail;

    if (user.status === 'pending') {
      return Response.json(
        { error: 'Akun lo masih menunggu persetujuan admin.', code: 'pending' },
        { status: 403 }
      );
    }
    if (user.status === 'rejected') {
      return Response.json(
        { error: 'Akun lo tidak aktif. Hubungi admin.', code: 'rejected' },
        { status: 403 }
      );
    }
    if (user.status !== 'active') {
      return fail;
    }

    await createSession(user.id);
    return Response.json({
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
