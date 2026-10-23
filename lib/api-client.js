// lib/api-client.js — helper fetch dari komponen client.
// Cookie session otomatis ikut (same-origin), jadi gak perlu header Authorization.
export const SUPABASE_URL = null; // ponytail: legacy export, dihapus setelah PendingStatus dirapikan

export async function apiFetch(url, options = {}) {
  const signal = options.signal ?? AbortSignal.timeout(20000);
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal,
  });
}
