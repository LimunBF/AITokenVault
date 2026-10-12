// lib/server-auth.js — helper buat API route: resolve user dari Authorization header.
// Client kirim: fetch(url, { headers: { Authorization: `Bearer ${access_token}` } }).
// Hasil: supabase dengan session user tsb (RLS aktif per user), atau null kalau invalid.

import { createClient } from '@supabase/supabase-js';

export async function getUserClient(request) {
  const none = { supabase: null, user: null };
  const authHeader = request.headers.get('Authorization') || '';
  const accessToken = authHeader.replace('Bearer ', '');
  if (!accessToken) return none;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return none;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return none;

  return { supabase, user: data.user };
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
