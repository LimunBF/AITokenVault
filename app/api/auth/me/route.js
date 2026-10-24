// app/api/auth/me/route.js — sumber tunggal status login buat client.
export const dynamic = 'force-dynamic';

import { getSessionUser } from '@/lib/auth';
import { safeError } from '@/lib/security';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return Response.json({ user: null });
    return Response.json({ user });
  } catch (err) {
    return safeError(err, "api");
  }
}
