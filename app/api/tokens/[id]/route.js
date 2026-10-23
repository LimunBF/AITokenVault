// app/api/tokens/[id]/route.js
// GET: reveal token (dekripsi, balikin plaintext)
// PATCH: ubah status / notes / label
// DELETE: soft delete (set deleted_at)
import { queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { decryptToken } from '@/lib/crypto';

const PUBLIC_COLS = 'id, provider_id, label, status, notes, created_at, updated_at';

export async function GET(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const row = await queryOne(
      `SELECT token_encrypted, token_iv, deleted_at
         FROM atv_tokens WHERE id = ? AND user_id = ? LIMIT 1`,
      [params.id, user.id]
    );
    if (!row) return Response.json({ error: 'Token not found' }, { status: 404 });
    if (row.deleted_at) return Response.json({ error: 'Token deleted' }, { status: 410 });

    const plaintext = await decryptToken(row.token_encrypted, row.token_iv);
    return Response.json({ token: plaintext });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { status, notes, label } = await request.json();
    const sets = [];
    const values = [];

    if (status !== undefined) {
      if (!['active', 'expired', 'out_of_quota'].includes(status)) {
        return Response.json({ error: 'Status gak valid.' }, { status: 400 });
      }
      sets.push('status = ?');
      values.push(status);
    }
    if (notes !== undefined) {
      sets.push('notes = ?');
      values.push(notes);
    }
    if (label !== undefined) {
      sets.push('label = ?');
      values.push(label);
    }
    if (!sets.length) {
      return Response.json({ error: 'Gak ada field yang diubah.' }, { status: 400 });
    }

    values.push(params.id, user.id);
    const result = await run(
      `UPDATE atv_tokens SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    if (!result.affectedRows) return Response.json({ error: 'Not found' }, { status: 404 });

    const row = await queryOne(
      `SELECT ${PUBLIC_COLS} FROM atv_tokens WHERE id = ?`,
      [params.id]
    );
    return Response.json(row);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const result = await run(
      'UPDATE atv_tokens SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [params.id, user.id]
    );
    if (!result.affectedRows) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
