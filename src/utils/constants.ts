// Shared financial-model constants. Single source of truth for magic numbers
// previously scattered across calculatorEngine, SummaryCards, and App.

export const FINANCIAL_CONSTANTS = {
  /** Monte Carlo trials for success-rate estimation. */
  MONTE_CARLO_TRIALS: 500,
  /** Gross-up applied to pre-tax (401k) withdrawals to approximate income tax. */
  PRE_TAX_WITHDRAWAL_GROSS_UP: 1.15,
  /** Approximate share of a mortgage payment that reduces principal (legacy fallback). */
  MORTGAGE_PRINCIPAL_SHARE_FALLBACK: 0.6,
  /** FIRE target multiple of annual retirement spending. */
  FIRE_MULTIPLE: 25,
  /** Default nominal returns when custom inputs are empty. */
  DEFAULT_STOCK_RETURN_NOMINAL: 0.098,
  DEFAULT_BOND_RETURN_NOMINAL: 0.048,
  DEFAULT_CASH_RETURN_NOMINAL: 0.025,
  /** Lifestyle tier multipliers applied to base monthly spend. */
  LIFESTYLE_MULTIPLIERS: {
    minimalist: 0.8,
    luxury: 1.6,
  } as const,
  /** Social Security adjustments vs full retirement age 67. */
  SS_EARLY_REDUCTION_PER_YEAR: 0.0667,
  SS_LATE_BONUS_PER_YEAR: 0.08,
  SS_LATE_BONUS_MAX_YEARS: 3,
} as const;

export const VALIDATION_LIMITS = {
  MIN_AGE: 18,
  MAX_AGE: 100,
  MIN_RETIREMENT_AGE_OFFSET: 1,
  MAX_RETIREMENT_AGE: 85,
  MAX_SAVINGS_RATE_PCT: 75,
  MIN_SAVINGS_RATE_PCT: 0,
  MAX_COL_ADJUSTMENT_PCT: 50,
  MIN_COL_ADJUSTMENT_PCT: -50,
} as const;
