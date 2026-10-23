// app/api/admin/users/route.js
// GET: list semua user (admin)
// PATCH: approve / reject / soft-delete (admin)
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin' || user.status !== 'active') return null;
  return user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const rows = await query(
      `SELECT id, email, role, status, created_at, approved_at
         FROM atv_users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC`
    );
    return Response.json(rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { user_id, action } = await request.json();
    if (!user_id) return Response.json({ error: 'user_id wajib' }, { status: 400 });

    // Admin gak boleh ngehapus/reject dirinya sendiri.
    if (user_id === admin.id && action !== 'approve') {
      return Response.json({ error: 'Gak bisa ubah akun sendiri' }, { status: 400 });
    }

    let sql;
    if (action === 'approve') {
      sql = "UPDATE atv_users SET status='active', approved_at=UTC_TIMESTAMP() WHERE id=?";
    } else if (action === 'reject') {
      sql = "UPDATE atv_users SET status='rejected' WHERE id=?";
    } else if (action === 'delete') {
      sql = 'UPDATE atv_users SET deleted_at=UTC_TIMESTAMP() WHERE id=?';
    } else {
      return Response.json({ error: 'action tidak valid' }, { status: 400 });
    }

    const result = await run(sql, [user_id]);
    if (!result.affectedRows) return Response.json({ error: 'Not found' }, { status: 404 });

    if (action === 'delete' || action === 'reject') {
      // Session lama langsung dicabut — user gak bisa lanjut pakai cookie lamanya.
      await run('DELETE FROM atv_sessions WHERE user_id = ?', [user_id]);
    }

    const row = await queryOne(
      'SELECT id, email, role, status, created_at, approved_at FROM atv_users WHERE id = ?',
      [user_id]
    );
    return Response.json(row);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
