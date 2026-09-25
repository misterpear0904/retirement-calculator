// Illustrative global benchmarks for the Compare view.
//
// These are ROUGH, household-level approximations compiled from public sources
// (US Census CPS, Federal Reserve SCF 2022, ECB HFCS Wave 4, China NBS, World Bank,
// UBS Global Wealth Report). They are intentionally rounded and should be treated
// as conversation starters, not precise statistics — the UI labels them as estimates.
// All money values are USD.

export interface AgeBand {
  minAge: number;
  maxAge: number | null;
  label: string;
  /** US median household net worth for this band (SCF 2022, rounded). */
  usMedianWealthUSD: number;
}

export const US_OVERALL_MEDIAN_WEALTH_USD = 193_000;

export const AGE_BANDS: AgeBand[] = [
  { minAge: 0, maxAge: 34, label: 'Under 35', usMedianWealthUSD: 39_000 },
  { minAge: 35, maxAge: 44, label: '35–44', usMedianWealthUSD: 135_000 },
  { minAge: 45, maxAge: 54, label: '45–54', usMedianWealthUSD: 247_000 },
  { minAge: 55, maxAge: 64, label: '55–64', usMedianWealthUSD: 364_000 },
  { minAge: 65, maxAge: 74, label: '65–74', usMedianWealthUSD: 410_000 },
  { minAge: 75, maxAge: null, label: '75+', usMedianWealthUSD: 336_000 },
];

export interface RegionBenchmark {
  id: string;
  name: string;
  flagEmoji: string;
  /** Median household disposable income, USD, rough 2023-24. */
  medianHouseholdIncomeUSD: number;
  /** Median household net worth, USD, rough. */
  medianHouseholdWealthUSD: number;
  /** Average household savings rate, % of disposable income, rough. */
  avgSavingsRatePct: number;
  /** Lognormal sigma assumptions for percentile estimates. */
  sigmaIncome: number;
  sigmaWealth: number;
  sources: string;
}

export const REGION_BENCHMARKS: RegionBenchmark[] = [
  {
    id: 'US',
    name: 'United States',
    flagEmoji: '🇺🇸',
    medianHouseholdIncomeUSD: 81_000,
    medianHouseholdWealthUSD: 193_000,
    avgSavingsRatePct: 5,
    sigmaIncome: 0.75,
    sigmaWealth: 1.15,
    sources: 'Census CPS 2023, Fed SCF 2022, BEA',
  },
  {
    id: 'EU',
    name: 'European Union',
    flagEmoji: '🇪🇺',
    medianHouseholdIncomeUSD: 35_000,
    medianHouseholdWealthUSD: 130_000,
    avgSavingsRatePct: 13,
    sigmaIncome: 0.7,
    sigmaWealth: 1.1,
    sources: 'Eurostat 2023, ECB HFCS Wave 4 (approx)',
  },
  {
    id: 'CN',
    name: 'China',
    flagEmoji: '🇨🇳',
    medianHouseholdIncomeUSD: 13_000,
    medianHouseholdWealthUSD: 45_000,
    avgSavingsRatePct: 32,
    sigmaIncome: 0.8,
    sigmaWealth: 1.2,
    sources: 'NBS 2023, UBS Global Wealth Report (approx)',
  },
  {
    id: 'ET',
    name: 'Ethiopia',
    flagEmoji: '🇪🇹',
    medianHouseholdIncomeUSD: 1_800,
    medianHouseholdWealthUSD: 3_000,
    avgSavingsRatePct: 10,
    sigmaIncome: 0.9,
    sigmaWealth: 1.3,
    sources: 'World Bank, UBS GWR (rough estimate)',
  },
];

/** Standard normal CDF (Abramowitz & Stegun approximation). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-(z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Percentile (1–99) of value x against a lognormal with given median and sigma. */
export function lognormalPercentile(x: number, median: number, sigma: number): number {
  const safeX = Math.max(1, x);
  const safeMedian = Math.max(1, median);
  const z = (Math.log(safeX) - Math.log(safeMedian)) / sigma;
  return Math.min(99, Math.max(1, Math.round(normalCdf(z) * 100)));
}

/** Savings-rate percentile via a simple normal model (sd 8pp). */
export function savingsPercentile(userPct: number, avgPct: number): number {
  return Math.min(99, Math.max(1, Math.round(normalCdf((userPct - avgPct) / 8) * 100)));
}

export function getBandForAge(age: number): AgeBand {
  return (
    AGE_BANDS.find((b) => age >= b.minAge && (b.maxAge == null || age <= b.maxAge)) ??
    AGE_BANDS[AGE_BANDS.length - 1]
  );
}

/**
 * Age-adjusted median wealth for a region: US uses SCF bands directly;
 * other regions scale their overall median by the US age profile shape.
 */
export function ageAdjustedWealthMedian(region: RegionBenchmark, age: number): number {
  const band = getBandForAge(age);
  if (region.id === 'US') return band.usMedianWealthUSD;
  const shape = band.usMedianWealthUSD / US_OVERALL_MEDIAN_WEALTH_USD;
  return Math.round(region.medianHouseholdWealthUSD * shape);
}

export function multipleOfMedian(x: number, median: number): number {
  if (median <= 0) return 0;
  return Math.round((x / median) * 10) / 10;
}
