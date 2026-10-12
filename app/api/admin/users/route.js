// app/api/admin/users/route.js
// GET: list semua user (admin only)
// PATCH: approve / reject / soft-delete user (admin only)

import { getUserClient } from '@/lib/server-auth';
import { createAdmin } from '@/lib/supabase-admin';

async function requireAdmin(request) {
  const ctx = await getUserClient(request);
  if (!ctx?.user) return null;

  // Cek role pakai service role: RLS di profiles tidak izinkan baca baris orang lain.
  const admin = createAdmin();
  const { data: me } = await admin
    .from('profiles')
    .select('role, status, deleted_at')
    .eq('id', ctx.user.id)
    .single();

  if (!me || me.role !== 'admin' || me.status !== 'active' || me.deleted_at) return null;
  return { admin, user: ctx.user };
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export async function GET(request) {
  try {
    const ctx = await requireAdmin(request);
    if (!ctx) return unauthorized();

    const { data, error } = await ctx.admin
      .from('profiles')
      .select('id, email, role, status, created_at, approved_at, deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending:false });

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const ctx = await requireAdmin(request);
    if (!ctx) return unauthorized();

    const { user_id, action } = await request.json();
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id wajib' }), { status: 400 });

    // Admin tidak boleh ngehapus/reject dirinya sendiri.
    if (user_id === ctx.user.id && action !== 'approve') {
      return new Response(JSON.stringify({ error: 'Gak bisa ubah akun sendiri' }), { status: 400 });
    }

    const updates =
      action === 'approve' ? { status: 'active', approved_at: new Date().toISOString() }
      : action === 'reject' ? { status: 'rejected' }
      : action === 'delete' ? { deleted_at: new Date().toISOString() }
      : null;

    if (!updates) return new Response(JSON.stringify({ error: 'action tidak valid' }), { status: 400 });

    const { data, error } = await ctx.admin
      .from('profiles')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
