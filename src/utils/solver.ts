// Reverse solver: instead of asking "what happens to my plan", ask
// "what input achieves my goal". Implemented as monotone-predicate binary
// searches around the pure simulation engine.
//
// Monotonicity assumption (documented): retiring later strictly weakens the
// decumulation-phase risk (fewer retired years, more contributions), and a
// higher savings rate strictly increases every year's contributions. There
// can be plateaus, which binary search handles fine; monotonicity is asserted
// by the test suite on representative plans.

import { RetirementState } from '../types/retirement';
import { runRetirementSimulation } from './calculatorEngine';
import { VALIDATION_LIMITS } from './constants';

export interface SolveInput {
  /** MC success rate target in percent (e.g. 90). */
  targetSuccessRate: number;
  /** Trials per probe — reduced from the default for interactive solving. */
  trials?: number;
}

/**
 * Earliest retirement age that still meets the target success rate.
 * Returns null when even the latest allowed age falls short.
 */
export function solveRetirementAge(state: RetirementState, input: SolveInput): number | null {
  const trials = input.trials ?? 300;
  const lo: number = state.currentAge + 1;
  const hi: number = Math.min(
    state.lifeExpectancy || VALIDATION_LIMITS.MAX_RETIREMENT_AGE,
    VALIDATION_LIMITS.MAX_RETIREMENT_AGE
  );
  if (hi <= lo) return null;

  const successAt = (age: number): number =>
    runRetirementSimulation({ ...state, targetRetirementAge: age }, { trials }).successRate;

  if (successAt(hi) < input.targetSuccessRate) return null;

  let lo2 = lo;
  let hi2 = hi;
  while (lo2 < hi2) {
    const mid = Math.floor((lo2 + hi2) / 2);
    if (successAt(mid) >= input.targetSuccessRate) hi2 = mid;
    else lo2 = mid + 1;
  }
  return lo2;
}

/**
 * Lowest savings rate (percent of income) that meets the target success rate.
 * Returns null when even the maximum rate falls short.
 */
export function solveSavingsRate(state: RetirementState, input: SolveInput): number | null {
  const trials = input.trials ?? 300;
  const lo: number = VALIDATION_LIMITS.MIN_SAVINGS_RATE_PCT;
  const hi: number = VALIDATION_LIMITS.MAX_SAVINGS_RATE_PCT;

  const successAt = (ratePct: number): number =>
    runRetirementSimulation(
      { ...state, savingsRatePct: ratePct, useFixedContribution: false },
      { trials }
    ).successRate;

  if (successAt(hi) < input.targetSuccessRate) return null;

  let lo2 = lo;
  let hi2 = hi;
  while (lo2 < hi2) {
    const mid = Math.floor((lo2 + hi2) / 2);
    if (successAt(mid) >= input.targetSuccessRate) hi2 = mid;
    else lo2 = mid + 1;
  }
  return hi2;
}
