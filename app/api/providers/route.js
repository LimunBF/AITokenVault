// app/api/providers/route.js
// GET: list providers milik user yang login
// POST: tambah provider baru
import crypto from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { safeUrl, safeError, readJson, checkOrigin } from '@/lib/security';

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
    return safeError(err, "providers");
  }
}

export async function POST(request) {
  try {
    const origin = checkOrigin(request);
    if (!origin.ok) return Response.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { name, url, category, model, tags = [], notes } = await readJson(request);
    if (!name || !url) {
      return Response.json({ error: 'Nama dan URL wajib diisi.' }, { status: 400 });
    }
    if (String(name).length > 255) {
      return Response.json({ error: 'Nama maksimal 255 karakter.' }, { status: 400 });
    }

    // Cegah XSS: hanya http/https. javascript:/data: akan dieksekusi saat
    // link diklik, dan itu bisa mencuri cookie session.
    const cleanUrl = safeUrl(url);
    if (!cleanUrl) {
      return Response.json(
        { error: 'URL harus diawali http:// atau https://' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await run(
      `INSERT INTO atv_providers (id, user_id, name, url, category, model, tags, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        name,
        cleanUrl,
        category || null,
        model || null,
        JSON.stringify(Array.isArray(tags) ? tags.slice(0, 20) : []),
        notes || null,
      ]
    );

    const row = await queryOne('SELECT * FROM atv_providers WHERE id = ?', [id]);
    return Response.json(shape(row), { status: 201 });
  } catch (err) {
    return safeError(err, "providers");
  }
}
