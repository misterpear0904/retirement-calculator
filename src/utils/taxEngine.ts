import { TaxFilingStatus } from '../types/retirement';

// Simplified-but-real US federal tax model, pinned to tax year 2026
// (Rev. Proc. 2025-32 and IR-2025-148 figures).
// Documented approximations: standard deduction only (no itemizing),
// SS taxation via the IRS provisional-income formula, capital gains on
// taxable-account withdrawals via an assumed cost-basis ratio, MAGI
// approximated as ordinary + capital-gain income, and the legacy age-65
// additional standard deduction ($2,100 TY2026) is folded into the senior
// figures below rather than modeled separately.

export const TAX_YEAR = 2026;

const SINGLE_BRACKETS: Array<[number, number]> = [
  [12400, 0.1],
  [50400, 0.12],
  [105700, 0.22],
  [201775, 0.24],
  [256225, 0.32],
  [640600, 0.35],
  [Infinity, 0.37],
];

const JOINT_BRACKETS: Array<[number, number]> = [
  [24800, 0.1],
  [100800, 0.12],
  [211400, 0.22],
  [403550, 0.24],
  [512450, 0.32],
  [768700, 0.35],
  [Infinity, 0.37],
];

/** TY2026 standard deduction (Rev. Proc. 2025-32). */
export const STANDARD_DEDUCTION: Record<TaxFilingStatus, number> = {
  single: 16100,
  joint: 32200,
};

/**
 * Long-term capital-gains band breakpoints (TY2026, Rev. Proc. 2025-32).
 * These are the *maximum zero-rate / 15%-rate amounts*, which differ from the
 * ordinary bracket tops (50,400 / 100,800) because the two are indexed under
 * separate sections.
 */
const GAINS_15_THRESHOLD: Record<TaxFilingStatus, number> = { single: 49450, joint: 98900 };
const GAINS_20_THRESHOLD: Record<TaxFilingStatus, number> = { single: 545500, joint: 613700 };

/** Share of each taxable-account withdrawal assumed to be gain (rest is basis). */
export const TAXABLE_GAIN_RATIO = 0.3;

/**
 * SECURE 2.0 RMD starting ages: born 1951-1959 → 73, born 1960+ → 75.
 * (Born ≤1950 → 72, already past RMD age; treated as 73+ here.)
 */
export function rmdStartAgeForBirthYear(birthYear: number): 73 | 75 {
  return birthYear <= 1959 ? 73 : 75;
}

/** Earliest age the Uniform Lifetime Table below covers (age 72). */
export const RMD_TABLE_MIN_AGE = 72;

/**
 * IRS Uniform Lifetime Table, Publication 590-B Table III (owner / spouse not
 * >10 yrs younger). Ages 72-74 apply to the earlier SECURE 2.0 cohort
 * (`rmdStartAgeForBirthYear`); ages 75+ apply to everyone else.
 */
const RMD_DIVISORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5,
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

/**
 * RMD divisor for a given age. Returns Infinity below the table's minimum
 * age (72) — callers decide the actual start age via
 * `rmdStartAgeForBirthYear` and guard on it.
 */
export function rmdDivisor(age: number): number {
  if (!Number.isFinite(age) || age < RMD_TABLE_MIN_AGE) return Infinity;
  return RMD_DIVISORS[Math.floor(age)] ?? RMD_DIVISOR_TERMINAL;
}

/**
 * Social Security benefit factor vs full retirement age 67, using the real
 * SSA two-tier early-reduction formula: 5/9 of 1% per month for the first 36
 * months of early claiming, 5/12 of 1% per month beyond that (62 → 0.70,
 * 63 → 0.75, 64 → 0.80, 65 → 0.8667, 66 → 0.9333), and an 8%/yr delayed
 * retirement credit up to age 70 (70 → 1.24).
 */
export function ssClaimFactor(startAge: number): number {
  if (startAge < 67) {
    const monthsEarly = (67 - startAge) * 12;
    const early = Math.min(monthsEarly, 36) * (5 / 9 / 100);
    const late = Math.max(0, monthsEarly - 36) * (5 / 12 / 100);
    return 1.0 - early - late;
  }
  if (startAge > 67) {
    return 1.0 + Math.min(3, startAge - 67) * 0.08;
  }
  return 1.0;
}

/**
 * Spousal benefit factor: fraction of the 50% maximum spousal benefit that a
 * spouse receives when claiming before their own FRA of 67 (real SSA formula:
 * 25/36 of 1% per month for the first 36 months, then 5/12 of 1% — no delayed
 * credits on the spousal portion). E.g. claiming at 62 → 0.65 of the share.
 */
export function spousalClaimFactor(startAge: number): number {
  if (startAge >= 67) return 1.0; // No delayed credits on spousal
  const monthsEarly = (67 - startAge) * 12;
  if (monthsEarly <= 36) {
    return 1.0 - monthsEarly * (25 / 36 / 100);
  }
  // 25/36% for first 36 months, then 5/12% for additional months
  return 0.75 - (monthsEarly - 36) * (5 / 12 / 100);
}

// ---------------------------------------------------------------------------
// Medicare (2026 figures: CMS fact sheet "2026 Medicare Parts A & B Premiums
// and Deductibles", released 2025-11-14).
// ---------------------------------------------------------------------------

/** 2026 Medicare figures. IRMAA tiers: [single MAGI cap, joint MAGI cap, Part B surcharge, Part D surcharge]. */
export const MEDICARE_2026 = {
  partBStandardMonthly: 202.9,
  partDBaseMonthly: 38.99,
  // [single MAGI cap, joint MAGI cap, Part B surcharge, Part D surcharge],
  // ordered smallest → largest; `medicareTierIndex` scans top-down.
  tiers: [
    [109000, 218000, 0, 0],
    [137000, 274000, 81.2, 14.5],
    [171000, 342000, 202.9, 37.5],
    [205000, 410000, 324.6, 60.4],
    [500000, 750000, 446.3, 83.3],
    [Infinity, Infinity, 487.0, 91.0],
  ] as Array<[number, number, number, number]>,
};

/** IRMAA tier index for a MAGI and filing status (0 = no surcharge). */
export function medicareTierIndex(magi: number, filing: TaxFilingStatus): number {
  for (let i = 0; i < MEDICARE_2026.tiers.length; i++) {
    const cap = MEDICARE_2026.tiers[i][filing === 'joint' ? 1 : 0];
    if (magi <= cap) return i;
  }
  return MEDICARE_2026.tiers.length - 1;
}

/**
 * Monthly Medicare premiums for a MAGI: total Part B premium (standard +
 * surcharge) and the Part D surcharge added on top of any plan premium.
 * `planYear` scales the base premiums by cumulative inflation so a plan
 * projecting 2055 doesn't bill 2026 dollars.
 */
export function medicarePremiums(
  magi: number,
  filing: TaxFilingStatus,
  inflationAdjustmentFactor = 1
): { partB: number; partDSurcharge: number } {
  const tier = medicareTierIndex(magi, filing);
  const partBSurcharge = MEDICARE_2026.tiers[tier][2];
  const partDSurcharge = MEDICARE_2026.tiers[tier][3];
  return {
    partB: (MEDICARE_2026.partBStandardMonthly + partBSurcharge) * inflationAdjustmentFactor,
    partDSurcharge: partDSurcharge * inflationAdjustmentFactor,
  };
}

/** Per-bracket fill for a taxable income amount (P4 Roth ladder viz). */
export interface BracketFill {
  cap: number;
  rate: number;
  floor: number;
  filled: number;
}

export function bracketFill(taxableIncome: number, filing: TaxFilingStatus): BracketFill[] {
  const brackets = filing === 'joint' ? JOINT_BRACKETS : SINGLE_BRACKETS;
  let floor = 0;
  const income = Math.max(0, taxableIncome);
  return brackets.map(([cap, rate]) => {
    const width = cap === Infinity ? Math.max(0, income - floor) : Math.max(0, cap - floor);
    const filled = Math.min(Math.max(0, income - floor), width);
    const row = { cap, rate, floor, filled };
    floor = cap;
    return row;
  });
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

/**
 * OBBB senior deduction: an extra $6,000 per taxpayer aged 65+, available for
 * tax years 2025-2028, phasing out at 6% of MAGI above $75,000 (single) /
 * $150,000 (joint). Outside the 2025-2028 window the deduction is zero.
 */
export function seniorDeduction(
  eligibleCount: number,
  magi: number,
  filing: TaxFilingStatus,
  planYear: number
): number {
  if (planYear < 2025 || planYear > 2028 || eligibleCount <= 0) return 0;
  const base = Math.min(eligibleCount, 2) * 6000;
  const phaseOutStart = filing === 'joint' ? 150000 : 75000;
  const reduction = 0.06 * Math.max(0, magi - phaseOutStart);
  return Math.max(0, base - reduction);
}

export interface WithdrawalTaxInputs {
  preTaxDraw: number; // gross 401k/IRA withdrawals (incl. RMDs + Roth conversions)
  taxableDraw: number; // taxable-account withdrawals
  pensionAnnual: number;
  ssAnnual: number;
  filing: TaxFilingStatus;
  stateTaxPct: number; // applied to ordinary income
  /** Primary's age this year, for the senior deduction (optional). */
  primaryAge?: number;
  /** Partner's age this year (optional). */
  partnerAge?: number;
  /** Calendar year of the projection (optional; gates the senior deduction). */
  planYear?: number;
}

/** Total tax bill for a year of retirement draws. */
export function calcWithdrawalTaxes(t: WithdrawalTaxInputs): {
  federal: number;
  state: number;
  gains: number;
  seniorDeduction: number;
  total: number;
  taxableSs: number;
} {
  const gains = Math.max(0, t.taxableDraw) * TAXABLE_GAIN_RATIO;
  const ordinaryPreSs = Math.max(0, t.preTaxDraw) + Math.max(0, t.pensionAnnual);
  const taxableSs = taxableSocialSecurity(t.ssAnnual, ordinaryPreSs, t.filing);
  const ordinary = ordinaryPreSs + taxableSs;
  const senior =
    t.primaryAge != null
      ? seniorDeduction(
          (t.primaryAge >= 65 ? 1 : 0) + (t.partnerAge != null && t.partnerAge >= 65 ? 1 : 0),
          ordinary + gains,
          t.filing,
          t.planYear ?? new Date().getFullYear()
        )
      : 0;
  const deductions = STANDARD_DEDUCTION[t.filing] + senior;
  const taxableOrdinary = Math.max(0, ordinary - deductions);
  const federal = bracketTax(taxableOrdinary, t.filing === 'joint' ? JOINT_BRACKETS : SINGLE_BRACKETS);
  const gainsTax = federalGainsTax(gains, taxableOrdinary, t.filing);
  const state = ordinary * Math.max(0, t.stateTaxPct / 100);
  return { federal, state, gains: gainsTax, seniorDeduction: senior, total: federal + gainsTax + state, taxableSs };
}
