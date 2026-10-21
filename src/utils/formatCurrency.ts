// Single compact currency formatter used across axes, tooltips and cards.
// Renders K/M/B with one decimal place, e.g. $60.0B, -$1.5M, $42.0K.
export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Number.isFinite(value) ? value : 0);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

// Aliases for callers that prefer other names.
export const formatMoney = formatCurrency;
export const fmtCurrency = formatCurrency;
export const formatCompactCurrency = formatCurrency;

export default formatCurrency;
