// app/api/health/route.js — dipakai PendingStatus buat ping koneksi tiap 4 detik.
// Ringan: cuma cek DB hidup, tanpa auth.
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    await queryOne('SELECT 1 AS ok');
    return Response.json({ ok: true, ms: Date.now() - started });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 503 });
  }
}
