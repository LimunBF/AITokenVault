'use client';

// Empty state dengan SVG illustration
export function EmptyState({ icon = 'vault', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-16 text-center">
      <div className="mb-4 text-zinc-600">
        {icon === 'vault' ? (
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect x="12" y="20" width="48" height="36" rx="6" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="36" cy="38" r="8" stroke="currentColor" strokeWidth="2.5" />
            <path d="M36 34v8M32 38h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M28 20v-6M44 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="24" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" />
            <path d="M36 24v12l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}