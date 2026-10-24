// app/api/auth/login/route.js
// Status-driven: pending/rejected ditolak dengan pesan jelas, active langsung masuk.
import { queryOne } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { rateLimit, tooManyRequests, clientIp, safeError, readJson, checkOrigin } from '@/lib/security';

// Batasi brute force: 8 percobaan / 15 menit per IP + email.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

// Hash dummy buat "user gak ada". Tanpa ini, request untuk email yang gak
// terdaftar balik ~400ms lebih cepat (gak ada bcrypt compare), jadi penyerang
// bisa nebak email mana yang terdaftar dari lamanya response (timing attack).
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7kPqNqoQZ1cJ0Y0dQ2w3s0XQx8f4Yyu';

export async function POST(request) {
  try {
    const origin = checkOrigin(request);
    if (!origin.ok) return Response.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    const ip = clientIp(request);
    const { email, password } = await readJson(request);
    if (!email || !password) {
      return Response.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase().slice(0, 255);

    const rl = rateLimit(`login:${ip}:${normalized}`, { max: MAX_ATTEMPTS, windowMs: WINDOW_MS });
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const user = await queryOne(
      'SELECT id, email, password_hash, role, status, deleted_at FROM atv_users WHERE email = ? LIMIT 1',
      [normalized]
    );

    // Pesan sama untuk "user gak ada" dan "password salah" — jangan bocorin mana yang salah.
    const fail = Response.json({ error: 'Email atau password salah.' }, { status: 401 });

    // Tetap jalankan bcrypt walau user gak ada, biar waktu respons sama.
    if (!user || user.deleted_at) {
      await verifyPassword(password, DUMMY_HASH);
      return fail;
    }

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
    return safeError(err, 'POST /api/auth/login');
  }
}
