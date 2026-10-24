// app/api/providers/[id]/route.js
// GET: detail provider + token list
// PUT: update provider
// DELETE: hapus provider (token ikut kehapus via ON DELETE CASCADE)
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { safeUrl, safeError, readJson, checkOrigin } from '@/lib/security';

function shape(row) {
  let tags = [];
  if (row.tags) {
    try { tags = JSON.parse(row.tags); } catch { tags = []; }
  }
  return { ...row, tags };
}

export async function GET(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const provider = await queryOne(
      'SELECT * FROM atv_providers WHERE id = ? AND user_id = ? LIMIT 1',
      [params.id, user.id]
    );
    if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

    const tokens = await query(
      `SELECT id, provider_id, label, status, notes, created_at, updated_at
         FROM atv_tokens
        WHERE provider_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [params.id]
    );

    return Response.json({ ...shape(provider), tokens });
  } catch (err) {
    return safeError(err, "api");
  }
}

const FIELDS = {
  name: 'name',
  url: 'url',
  category: 'category',
  model: 'model',
  notes: 'notes',
};

export async function PUT(request, { params }) {
  try {
    const origin = checkOrigin(request);
    if (!origin.ok) return Response.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = await readJson(request);
    const sets = [];
    const values = [];

    // Validasi URL di PUT juga — kalau tidak, XSS bisa masuk lewat update.
    if (body.url !== undefined) {
      const cleanUrl = safeUrl(body.url);
      if (!cleanUrl) {
        return Response.json(
          { error: 'URL harus diawali http:// atau https://' },
          { status: 400 }
        );
      }
      body.url = cleanUrl;
    }
    if (body.name !== undefined && String(body.name).length > 255) {
      return Response.json({ error: 'Nama maksimal 255 karakter.' }, { status: 400 });
    }

    for (const [key, col] of Object.entries(FIELDS)) {
      if (body[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(body[key]);
      }
    }
    if (body.tags !== undefined) {
      sets.push('tags = ?');
      values.push(JSON.stringify(Array.isArray(body.tags) ? body.tags : []));
    }
    if (!sets.length) {
      return Response.json({ error: 'Gak ada field yang diubah.' }, { status: 400 });
    }

    values.push(params.id, user.id);
    const result = await run(
      `UPDATE atv_providers SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    if (!result.affectedRows) return Response.json({ error: 'Not found' }, { status: 404 });

    const row = await queryOne('SELECT * FROM atv_providers WHERE id = ?', [params.id]);
    return Response.json(shape(row));
  } catch (err) {
    return safeError(err, "api");
  }
}

export async function DELETE(request, { params }) {
  try {
    const origin = checkOrigin(request);
    if (!origin.ok) return Response.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const result = await run(
      'DELETE FROM atv_providers WHERE id = ? AND user_id = ?',
      [params.id, user.id]
    );
    if (!result.affectedRows) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ success: true });
  } catch (err) {
    return safeError(err, "api");
  }
}
