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

/** TY2025 standard deduction as amended by the One Big Beautiful Bill Act (IRS IR-2025-103). */
export const STANDARD_DEDUCTION: Record<TaxFilingStatus, number> = {
  single: 15750,
  joint: 31500,
};

/**
 * Top of the 0% long-term capital-gains band (TY2025, Rev. Proc. 2024-40).
 * These are the *maximum zero-rate amounts*, which differ from the 12% ordinary
 * bracket tops (48,475 / 96,950) because the two are indexed under separate sections.
 */
const GAINS_15_THRESHOLD: Record<TaxFilingStatus, number> = { single: 48350, joint: 96700 };
const GAINS_20_THRESHOLD: Record<TaxFilingStatus, number> = { single: 533400, joint: 600050 };

/** Share of each taxable-account withdrawal assumed to be gain (rest is basis). */
export const TAXABLE_GAIN_RATIO = 0.3;

/**
 * RMDs begin at 75 (SECURE 2.0). Divisors are the IRS Uniform Lifetime Table
 * (Publication 590-B, Table III) for ages 75+. Ages below 75 have no divisor
 * here — `rmdDivisor` returns Infinity and callers guard on `age >= RMD_START_AGE`.
 */
export const RMD_START_AGE = 75;

/** IRS Uniform Lifetime Table, Table III (account owner / spouse not >10 yrs younger). */
const RMD_DIVISORS: Record<number, number> = {
  75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3,
  99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5,
  111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8,
  117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

/** Age 120 and over uses the table's terminal divisor of 2.0. */
const RMD_DIVISOR_TERMINAL = 2.0;

export function rmdDivisor(age: number): number {
  if (!Number.isFinite(age) || age < RMD_START_AGE) return Infinity;
  return RMD_DIVISORS[Math.floor(age)] ?? RMD_DIVISOR_TERMINAL;
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

/** Spousal benefit factor (proper SSA formula: 25/36% per month early for 36 months, then 5/12% per month) */
export function spousalClaimFactor(startAge: number): number {
  if (startAge >= 67) return 1.0; // No delayed credits on spousal
  const monthsEarly = (67 - startAge) * 12;
  if (monthsEarly <= 36) {
    return 1.0 - monthsEarly * (25 / 36 / 100);
  } else {
    // 25/36% for first 36 months, then 5/12% for additional months
    return 0.75 - (monthsEarly - 36) * (5 / 12 / 100);
  }
}

/** Medicare IRMAA brackets (2025, modified adjusted gross income) */
export const IRMAA_BRACKETS: Record<TaxFilingStatus, Array<[number, number]>> = {
  single: [
    [106000, 0],      // Base premium
    [133000, 74.00],  // Part B increase
    [167000, 185.00],
    [200000, 295.90],
    [500000, 406.90],
    [Infinity, 443.90],
  ],
  joint: [
    [212000, 0],
    [266000, 74.00],
    [334000, 185.00],
    [400000, 295.90],
    [750000, 406.90],
    [Infinity, 443.90],
  ],
};

/** Base Medicare Part B premium (2025) */
export const MEDICARE_BASE_PREMIUM = 185.00;

/** Calculate Medicare Part B premium based on MAGI */
export function medicarePartBPremium(magi: number, filing: TaxFilingStatus): number {
  const brackets = IRMAA_BRACKETS[filing];
  for (const [threshold, premium] of brackets) {
    if (magi <= threshold) return premium;
  }
  return IRMAA_BRACKETS[filing][IRMAA_BRACKETS[filing].length - 1][1];
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
  // Second tier spans base + $12,000 (joint) / + $9,000 (single); the 50% add-on
  // itself is capped at $6,000 (joint) / $4,500 (single). Form 1040 SS worksheet.
  const tier2Span = filing === 'joint' ? 12000 : 9000;
  const tier2AddOnCap = filing === 'joint' ? 6000 : 4500;
  const t2 = t1 + tier2Span;
  if (provisional < t1) return 0;
  if (provisional < t2) return Math.min(0.5 * ssAnnual, 0.5 * (provisional - t1));
  const addOn = Math.min(tier2AddOnCap, 0.5 * ssAnnual);
  return Math.min(0.85 * ssAnnual, 0.85 * (provisional - t2) + addOn);
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
