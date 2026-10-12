// app/api/tokens/[id]/route.js
// PATCH: update status/notes/label
// DELETE: soft delete token (set deleted_at)
// GET: reveal token (decrypt, return plaintext)

import { getUserClient } from '@/lib/server-auth';
import { decryptToken } from '@/lib/crypto';

export async function PATCH(request, { params }) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { id } = params;
    const body = await request.json();
    const { status, notes, label } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (label !== undefined) updates.label = label;

    const { data, error } = await supabase
      .from('tokens')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { id } = params;

    const { error } = await supabase
      .from('tokens')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { id } = params;

    const { data: token, error } = await supabase
      .from('tokens')
      .select('token_encrypted, token_iv, deleted_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !token) {
      return new Response(JSON.stringify({ error: 'Token not found' }), { status: 404 });
    }
    if (token.deleted_at) {
      return new Response(JSON.stringify({ error: 'Token deleted' }), { status: 410 });
    }

    const plaintext = await decryptToken(token.token_encrypted, token.token_iv);

    return new Response(JSON.stringify({ token: plaintext }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}