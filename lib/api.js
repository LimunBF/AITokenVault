import { supabase } from '@/lib/supabase';

// Supabase URL buat ping kesehatan di PendingStatus.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// fetch yang otomatis bawa Bearer token user yang lagi login.
// Default timeout 20 detik biar gak ada request yang nge-gantung selamanya.
export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const signal = options.signal ?? AbortSignal.timeout(20000);
  return fetch(url, { ...options, headers, signal });
}
