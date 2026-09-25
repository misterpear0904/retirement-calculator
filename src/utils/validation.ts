import { RetirementState } from '../types/retirement';
import { VALIDATION_LIMITS } from './constants';

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Clamp numeric state into sane ranges so the engine never sees impossible ages/percents. */
export function sanitizeRetirementState(state: RetirementState): RetirementState {
  const clamp = (v: number, min: number, max: number, fallback = 0) => {
    if (!Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };

  const currentAge = Math.round(clamp(state.currentAge, VALIDATION_LIMITS.MIN_AGE, VALIDATION_LIMITS.MAX_AGE, 32));
  const lifeExpectancy = Math.round(
    clamp(state.lifeExpectancy, currentAge + 1, VALIDATION_LIMITS.MAX_AGE + 10, 90)
  );
  const targetRetirementAge = Math.round(
    clamp(
      state.targetRetirementAge,
      currentAge + 1,
      Math.min(VALIDATION_LIMITS.MAX_RETIREMENT_AGE, lifeExpectancy),
      Math.min(60, lifeExpectancy - 1)
    )
  );

  return {
    ...state,
    currentAge,
    lifeExpectancy,
    targetRetirementAge,
    savingsRatePct: clamp(state.savingsRatePct, VALIDATION_LIMITS.MIN_SAVINGS_RATE_PCT, VALIDATION_LIMITS.MAX_SAVINGS_RATE_PCT, 20),
    colAdjustmentPct: clamp(
      state.colAdjustmentPct ?? 0,
      VALIDATION_LIMITS.MIN_COL_ADJUSTMENT_PCT,
      VALIDATION_LIMITS.MAX_COL_ADJUSTMENT_PCT,
      0
    ),
    stockPct: clamp(state.stockPct ?? 0, 0, 100, 80),
    bondPct: clamp(state.bondPct ?? 0, 0, 100, 15),
    cashPct: clamp(state.cashPct ?? 0, 0, 100, 5),
    socialSecurityStartAge: Math.round(clamp(state.socialSecurityStartAge ?? 67, 62, 70, 67)),
    pensionStartAge: Math.round(clamp(state.pensionStartAge ?? 65, 50, 75, 65)),
    mortgageRemainingYears: Math.max(0, Math.round(state.mortgageRemainingYears ?? 0)),
    liquidCash: Math.max(0, state.liquidCash ?? 0),
    taxableInvestments: Math.max(0, state.taxableInvestments ?? 0),
    preTax401k: Math.max(0, state.preTax401k ?? 0),
    postTaxRothHsa: Math.max(0, state.postTaxRothHsa ?? 0),
  };
}

/** Human-readable warnings for allocations that don't sum to 100%. */
export function validateRetirementState(state: RetirementState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allocSum = (state.stockPct ?? 0) + (state.bondPct ?? 0) + (state.cashPct ?? 0);
  if (Math.abs(allocSum - 100) > 0.01) {
    issues.push({
      field: 'allocation',
      message: `Asset allocation sums to ${Math.round(allocSum)}%, not 100%. Returns are weighted as-is.`,
    });
  }
  const split = state.contributionSplit;
  if (split) {
    const splitSum = split.preTaxPct + split.postTaxPct + split.taxablePct;
    if (Math.abs(splitSum - 100) > 0.01) {
      issues.push({
        field: 'contributionSplit',
        message: `Contribution split sums to ${Math.round(splitSum)}%, not 100%.`,
      });
    }
  }
  if (state.targetRetirementAge <= state.currentAge) {
    issues.push({
      field: 'targetRetirementAge',
      message: 'Target retirement age must be after current age.',
    });
  }
  if (state.lifeExpectancy <= state.targetRetirementAge) {
    issues.push({
      field: 'lifeExpectancy',
      message: 'Life expectancy must be after target retirement age.',
    });
  }
  return issues;
}
