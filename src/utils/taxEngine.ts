import { TaxFilingStatus } from '../types/retirement';
import { FINANCIAL_CONSTANTS } from './constants';

// Simplified-but-real US federal tax model (2025 figures).
// Documented approximations: standard deduction only (no itemizing),
// SS taxation via the IRS provisional-income formula, capital gains on
// taxable-account withdrawals via an assumed cost-basis ratio.

export const TAX_YEAR = 2025;

const SINGLE_BRACKETS: Array<[number, number]> = [
  [11925, 0.1],
  [48475, 0.12],
  [103350, 0.22],
  [197300, 0.24],
  [250525, 0.32],
  [626350, 0.35],
  [Infinity, 0.37],
];

const JOINT_BRACKETS: Array<[number, number]> = [
  [23850, 0.1],
  [96950, 0.12],
  [206700, 0.22],
  [394600, 0.24],
  [501050, 0.32],
  [751600, 0.35],
  [Infinity, 0.37],
];

export const STANDARD_DEDUCTION: Record<TaxFilingStatus, number> = {
  single: 15000,
  joint: 30000,
};

/** 0%/15%/20% capital-gains thresholds (taxable income, 2025). */
const GAINS_15_THRESHOLD: Record<TaxFilingStatus, number> = { single: 48475, joint: 96950 };
const GAINS_20_THRESHOLD: Record<TaxFilingStatus, number> = { single: 533400, joint: 600050 };

/** Share of each taxable-account withdrawal assumed to be gain (rest is basis). */
export const TAXABLE_GAIN_RATIO = 0.3;

/** RMDs begin at 75 (SECURE 2.0). Divisor approximates the IRS Uniform Lifetime Table. */
export const RMD_START_AGE = 75;
export function rmdDivisor(age: number): number {
  if (age < RMD_START_AGE) return Infinity;
  return Math.max(4.9, 27.4 - 0.9 * (age - 72));
}

/** Social Security benefit factor vs full retirement age 67 (moved from calculatorEngine). */
export function ssClaimFactor(startAge: number): number {
  if (startAge < 67)
    return Math.max(0.7, 1.0 - (67 - startAge) * FINANCIAL_CONSTANTS.SS_EARLY_REDUCTION_PER_YEAR);
  if (startAge > 67)
    return (
      1.0 +
      Math.min(FINANCIAL_CONSTANTS.SS_LATE_BONUS_MAX_YEARS, startAge - 67) *
        FINANCIAL_CONSTANTS.SS_LATE_BONUS_PER_YEAR
    );
  return 1.0;
}

function bracketTax(taxableIncome: number, brackets: Array<[number, number]>): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of brackets) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, cap) - prev) * rate;
    prev = cap;
  }
  return tax;
}

/** Federal income tax on ordinary income after the standard deduction. */
export function federalOrdinaryTax(ordinaryIncome: number, filing: TaxFilingStatus): number {
  const taxable = Math.max(0, ordinaryIncome - STANDARD_DEDUCTION[filing]);
  return bracketTax(taxable, filing === 'joint' ? JOINT_BRACKETS : SINGLE_BRACKETS);
}

/**
 * Taxable portion of Social Security (annual $) via the IRS provisional-income
 * formula. otherIncome = AGI excluding SS.
 */
export function taxableSocialSecurity(
  ssAnnual: number,
  otherIncome: number,
  filing: TaxFilingStatus
): number {
  if (ssAnnual <= 0) return 0;
  const provisional = otherIncome + 0.5 * ssAnnual;
  const t1 = filing === 'joint' ? 32000 : 25000;
  const t2 = filing === 'joint' ? 44000 : 34000;
  if (provisional < t1) return 0;
  if (provisional < t2) return Math.min(0.5 * ssAnnual, 0.5 * (provisional - t1));
  return Math.min(0.85 * ssAnnual, 0.85 * (provisional - t2) + Math.min(6000, 0.5 * ssAnnual));
}

/** Federal tax on long-term capital gains given total taxable income context. */
export function federalGainsTax(
  gains: number,
  ordinaryTaxableIncome: number,
  filing: TaxFilingStatus
): number {
  if (gains <= 0) return 0;
  const t15 = GAINS_15_THRESHOLD[filing];
  const t20 = GAINS_20_THRESHOLD[filing];
  const room0 = Math.max(0, t15 - ordinaryTaxableIncome);
  const at0 = Math.min(gains, room0);
  const room15 = Math.max(0, t20 - Math.max(ordinaryTaxableIncome, t15));
  const at15 = Math.min(Math.max(0, gains - at0), room15);
  const at20 = Math.max(0, gains - at0 - at15);
  return at15 * 0.15 + at20 * 0.2;
}

export interface WithdrawalTaxInputs {
  preTaxDraw: number; // gross 401k/IRA withdrawals (incl. RMDs + Roth conversions)
  taxableDraw: number; // taxable-account withdrawals
  pensionAnnual: number;
  ssAnnual: number;
  filing: TaxFilingStatus;
  stateTaxPct: number; // applied to ordinary income
}

/** Total tax bill for a year of retirement draws. */
export function calcWithdrawalTaxes(t: WithdrawalTaxInputs): {
  federal: number;
  state: number;
  gains: number;
  total: number;
  taxableSs: number;
} {
  const gains = Math.max(0, t.taxableDraw) * TAXABLE_GAIN_RATIO;
  const ordinaryPreSs = Math.max(0, t.preTaxDraw) + Math.max(0, t.pensionAnnual);
  const taxableSs = taxableSocialSecurity(t.ssAnnual, ordinaryPreSs, t.filing);
  const ordinary = ordinaryPreSs + taxableSs;
  const federal = federalOrdinaryTax(ordinary, t.filing);
  const ordinaryTaxable = Math.max(0, ordinary - STANDARD_DEDUCTION[t.filing]);
  const gainsTax = federalGainsTax(gains, ordinaryTaxable, t.filing);
  const state = ordinary * Math.max(0, t.stateTaxPct / 100);
  return { federal, state, gains: gainsTax, total: federal + gainsTax + state, taxableSs };
}

/**
 * Lightweight tax estimate for Monte Carlo trials (single-pot portfolio, no
 * account buckets): assumes ~65% of each net withdrawal is ordinary income
 * and ~10% is taxable gain.
 */
export function estimateMcTax(
  netWithdrawal: number,
  filing: TaxFilingStatus,
  stateTaxPct: number
): number {
  if (netWithdrawal <= 0) return 0;
  const ordinary = netWithdrawal * 0.65;
  const gains = netWithdrawal * 0.35 * TAXABLE_GAIN_RATIO;
  const ordinaryTaxable = Math.max(0, ordinary - STANDARD_DEDUCTION[filing]);
  return (
    federalOrdinaryTax(ordinary, filing) +
    federalGainsTax(gains, ordinaryTaxable, filing) +
    ordinary * Math.max(0, stateTaxPct / 100)
  );
}
