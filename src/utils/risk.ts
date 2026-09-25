// Single source of truth for plan-risk labeling (previously duplicated
// in Header.tsx and SummaryCards.tsx).

export type RiskLabel = 'Very Safe' | 'On Track' | 'Moderate Risk' | 'High Risk';

export function getRiskLabel(rate: number): RiskLabel {
  if (rate >= 85) return 'Very Safe';
  if (rate >= 70) return 'On Track';
  if (rate >= 50) return 'Moderate Risk';
  return 'High Risk';
}

export function getRiskBadgeClasses(rate: number): string {
  if (rate >= 85) return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  if (rate >= 70) return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
  if (rate >= 50) return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
  return 'bg-red-500/15 border-red-500/30 text-red-400';
}

export function getRiskCardClasses(rate: number): string {
  if (rate >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  if (rate >= 70) return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
  if (rate >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  return 'text-red-400 border-red-500/40 bg-red-500/10';
}
