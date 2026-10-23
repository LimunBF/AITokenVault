// app/api/tokens/route.js
// GET: list token user (opsional ?provider_id=)
// POST: tambah token (enkripsi AES-256-GCM di server)
import crypto from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { encryptToken } from '@/lib/crypto';

// token_encrypted/token_iv jangan pernah keluar ke client.
const PUBLIC_COLS =
  'id, provider_id, label, status, notes, created_at, updated_at';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const providerId = new URL(request.url).searchParams.get('provider_id');

    const rows = providerId
      ? await query(
          `SELECT ${PUBLIC_COLS} FROM atv_tokens
            WHERE user_id = ? AND provider_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC`,
          [user.id, providerId]
        )
      : await query(
          `SELECT ${PUBLIC_COLS} FROM atv_tokens
            WHERE user_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC`,
          [user.id]
        );

    return Response.json(rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { provider_id, label, token, status = 'active', notes } = await request.json();
    if (!provider_id || !label || !token) {
      return Response.json(
        { error: 'Provider, label, dan token wajib diisi.' },
        { status: 400 }
      );
    }
    if (!['active', 'expired', 'out_of_quota'].includes(status)) {
      return Response.json({ error: 'Status gak valid.' }, { status: 400 });
    }

    const provider = await queryOne(
      'SELECT id FROM atv_providers WHERE id = ? AND user_id = ? LIMIT 1',
      [provider_id, user.id]
    );
    if (!provider) {
      return Response.json({ error: 'Provider gak ditemukan.' }, { status: 404 });
    }

    const { token_encrypted, token_iv } = await encryptToken(token);
    const id = crypto.randomUUID();

    await run(
      `INSERT INTO atv_tokens
         (id, user_id, provider_id, label, token_encrypted, token_iv, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        provider_id,
        label,
        token_encrypted,
        token_iv,
        status,
        notes || null,
      ]
    );

    const row = await queryOne(
      `SELECT ${PUBLIC_COLS} FROM atv_tokens WHERE id = ?`,
      [id]
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
