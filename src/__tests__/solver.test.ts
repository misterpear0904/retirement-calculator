// @vitest-environment node
// Reverse-solver tests around the (seeded, deterministic) Monte Carlo engine.
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState } from '../types/retirement';
import { runRetirementSimulation } from '../utils/calculatorEngine';
import { solveRetirementAge, solveSavingsRate } from '../utils/solver';

function mkState(over: Partial<RetirementState> = {}): RetirementState {
  return {
    ...DEFAULT_STATE,
    hasChildren: false,
    children: [],
    debts: [],
    housingType: 'rent',
    rentMonthly: 0,
    essentialExpensesMonthly: 5000,
    discretionaryExpensesMonthly: 0,
    lifestyleTier: 'custom',
    healthcareMonthlyAt65: 0,
    includeMedicarePremiums: true,
    socialSecurityMonthlyAt67: 2000,
    pensionMonthly: 0,
    useRothConversions: false,
    spendingSmile: { early: 1, mid: 1, late: 1 },
    targetLocationId: '',
    returnMode: 'deterministic',
    inflationMode: 'fixed_3',
    ...over,
  };
}

describe('solveRetirementAge', () => {
  it('finds an age that actually meets the target success rate', () => {
    const state = mkState({ currentAge: 45, lifeExpectancy: 90 });
    const solved = solveRetirementAge(state, { targetSuccessRate: 90, trials: 80 });
    expect(solved).not.toBeNull();
    const rateAtSolved = runRetirementSimulation(
      { ...state, targetRetirementAge: solved as number },
      { trials: 80 }
    ).successRate;
    expect(rateAtSolved).toBeGreaterThanOrEqual(88); // small tolerance for probe granularity
  });

  it('returns a late age for a tight plan and null for an impossible one', () => {
    const tight = solveRetirementAge(
      mkState({ currentAge: 30, lifeExpectancy: 95, liquidCash: 1000, taxableInvestments: 0, preTax401k: 0, postTaxRothHsa: 0, savingsRatePct: 3 }),
      { targetSuccessRate: 95, trials: 40 }
    );
    // Either impossible (null) or a very late retirement age.
    expect(tight === null || tight! > 80).toBe(true);

    const impossible = solveRetirementAge(
      mkState({ currentAnnualIncome: 0, savingsRatePct: 0, liquidCash: 0, taxableInvestments: 0, preTax401k: 0, postTaxRothHsa: 0, socialSecurityMonthlyAt67: 0 }),
      { targetSuccessRate: 90, trials: 40 }
    );
    expect(impossible).toBeNull();
  });
});

describe('solveSavingsRate', () => {
  it('monotonically: success at the found rate meets the target and just-below fails within noise', () => {
    const state = mkState({ currentAge: 35 });
    const solved = solveSavingsRate(state, { targetSuccessRate: 90, trials: 80 });
    expect(solved).not.toBeNull();
    const rate = runRetirementSimulation(
      { ...state, savingsRatePct: solved as number, useFixedContribution: false },
      { trials: 80 }
    ).successRate;
    expect(rate).toBeGreaterThanOrEqual(88);
    // Lower rates should be worse (no requirement of strict monotonicity, but
    // a much lower rate must not beat the solution)
    const lower = runRetirementSimulation(
      { ...state, savingsRatePct: Math.max(0, (solved as number) - 15), useFixedContribution: false },
      { trials: 80 }
    ).successRate;
    expect(lower).toBeLessThanOrEqual(rate);
  });
});
