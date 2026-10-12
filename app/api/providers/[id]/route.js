// app/api/providers/[id]/route.js
// GET: detail provider + tokens
// PUT: update provider
// DELETE: delete provider (cascade delete tokens via DB)

import { getUserClient } from '@/lib/server-auth';

export async function GET(request, { params }) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { id } = params;

    const { data: provider, error: providerErr } = await supabase
      .from('providers')
      .select('*, tokens(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (providerErr) {
      if (providerErr.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      }
      throw providerErr;
    }

    return new Response(JSON.stringify(provider), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { id } = params;
    const body = await request.json();
    const { name, url, category, model, tags, notes } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (category !== undefined) updates.category = category;
    if (model !== undefined) updates.model = model;
    if (tags !== undefined) updates.tags = tags;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('providers')
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
      .from('providers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}