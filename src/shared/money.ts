export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function depositCents(totalCents: number, percent: number): number {
  if (totalCents <= 0) return 0;
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  if (pct >= 100) return totalCents;
  return Math.min(totalCents, Math.max(0, Math.round((totalCents * pct) / 100)));
}
