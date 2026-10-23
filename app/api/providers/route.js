// app/api/providers/route.js
// GET: list providers milik user yang login
// POST: tambah provider baru
import crypto from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

function shape(row) {
  // tags disimpan TEXT JSON; balikin sebagai array biar UI gak berubah.
  let tags = [];
  if (row.tags) {
    try { tags = JSON.parse(row.tags); } catch { tags = []; }
  }
  return { ...row, tags };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const rows = await query(
      'SELECT * FROM atv_providers WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    return Response.json(rows.map(shape));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { name, url, category, model, tags = [], notes } = await request.json();
    if (!name || !url) {
      return Response.json({ error: 'Nama dan URL wajib diisi.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await run(
      `INSERT INTO atv_providers (id, user_id, name, url, category, model, tags, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        name,
        url,
        category || null,
        model || null,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        notes || null,
      ]
    );

    const row = await queryOne('SELECT * FROM atv_providers WHERE id = ?', [id]);
    return Response.json(shape(row), { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
