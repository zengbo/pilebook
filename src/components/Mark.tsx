export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#13483d" />
      <rect x="7" y="8" width="18" height="4" rx="2" fill="#f3eee6" />
      <rect x="6" y="14" width="20" height="4" rx="2" fill="#e7c08a" />
      <rect x="7" y="20" width="18" height="4" rx="2" fill="#f3eee6" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className={`display text-xl ${light ? "text-paper" : "text-ink"}`}>Pilebook</span>
    </span>
  );
}
