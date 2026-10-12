// app/api/providers/route.js
// GET: list providers for logged-in user
// POST: create a new provider

import { getUserClient } from '@/lib/server-auth';

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export async function GET(request) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const body = await request.json();
    const { name, url, category, model, tags = [], notes } = body;

    if (!name || !url) {
      return new Response(JSON.stringify({ error: 'Name and URL are required' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('providers')
      .insert({
        user_id: user.id,
        name,
        url,
        category: category || null,
        model: model || null,
        tags,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
