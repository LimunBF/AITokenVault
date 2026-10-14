'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/strings';

// Feedback hidup pas request lama: detik berjalan + ping kesehatan server
// tiap 4 detik, jadi user tahu masalahnya di koneksi atau di server.
export function PendingStatus({ active, serverUrl }) {
  const [elapsed, setElapsed] = useState(0);
  const [net, setNet] = useState('unknown'); // unknown | ok | down

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      setNet('unknown');
      return;
    }
    const t0 = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);

    let alive = true;
    async function ping() {
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 3500);
        const r = await fetch(`${serverUrl}/auth/v1/health`, { signal: ctl.signal });
        clearTimeout(to);
        if (alive) setNet(r.ok ? 'ok' : 'down');
      } catch {
        if (alive) setNet('down');
      }
    }
    ping();
    const pinger = setInterval(ping, 4000);

    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(pinger);
    };
  }, [active, serverUrl]);

  if (!active) return null;

  const dot =
    net === 'ok' ? 'bg-emerald-400'
    : net === 'down' ? 'bg-red-400'
    : 'bg-amber-400 animate-pulse';
  const netLabel =
    net === 'ok' ? t.netOk
    : net === 'down' ? t.netDown
    : t.connecting;

  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-400" role="status" aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>
        {t.connecting}… {elapsed}d — {netLabel}
      </span>
    </div>
  );
}
