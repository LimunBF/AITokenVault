import { supabase } from '@/lib/supabase';

// fetch yang otomatis bawa Bearer token user yang lagi login.
export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}
