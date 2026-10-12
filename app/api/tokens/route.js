// app/api/tokens/route.js
// GET: list tokens for user (optional provider_id filter)
// POST: create a new token (server-side encryption)

import { getUserClient } from '@/lib/server-auth';
import { encryptToken } from '@/lib/crypto';

export async function GET(request) {
  try {
    const { supabase, user } = await getUserClient(request);
    if (!supabase || !user) return unauthorized();

    const url = new URL(request.url);
    const providerId = url.searchParams.get('provider_id');

    let query = supabase.from('tokens').select('*').eq('user_id', user.id);
    if (providerId) query = query.eq('provider_id', providerId);

    const { data, error } = await query.order('created_at', { ascending: false });

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
    const { provider_id, label, token, status = 'active', notes } = body;

    if (!provider_id || !label || !token) {
      return new Response(JSON.stringify({ error: 'Provider ID, label, and token are required' }), { status: 400 });
    }

    // Verify provider belongs to user
    const { data: provider, error: providerErr } = await supabase
      .from('providers')
      .select('id')
      .eq('id', provider_id)
      .eq('user_id', user.id)
      .single();

    if (providerErr || !provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 404 });
    }

    // Encrypt token server-side
    const { token_encrypted, token_iv } = await encryptToken(token);

    const { data: newToken, error } = await supabase
      .from('tokens')
      .insert({
        user_id: user.id,
        provider_id,
        label,
        token_encrypted,
        token_iv,
        status,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(newToken), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}