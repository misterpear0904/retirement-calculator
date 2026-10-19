// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState } from '../types/retirement';
import { runRetirementSimulation } from '../utils/calculatorEngine';

function mkState(over: Partial<RetirementState> = {}): RetirementState {
  return {
    ...DEFAULT_STATE,
    hasPartner: false,
    partner: { ...DEFAULT_STATE.partner, enabled: false },
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
    socialSecurityMonthlyAt67: 0,
    pensionMonthly: 0,
    useRothConversions: false,
    spendingSmile: { early: 1, mid: 1, late: 1 },
    targetLocationId: '',
    returnMode: 'deterministic',
    inflationMode: 'fixed_3',
    ...over,
  };
}

describe('Coast FIRE null path', () => {
  it('returns null when the portfolio can never coast', () => {
    const result = runRetirementSimulation(
      mkState({
        currentAge: 55,
        targetRetirementAge: 60,
        liquidCash: 0,
        taxableInvestments: 0,
        preTax401k: 0,
        postTaxRothHsa: 0,
        essentialExpensesMonthly: 9000,
        savingsRatePct: 0,
        currentAnnualIncome: 0,
      }),
      { trials: 1 }
    );
    expect(result.coastFireAge).toBeNull();
  });
});

describe('FIRE age (discounted target)', () => {
  it('finds the coast age for the default plan (regression: inflated-target bug made this null)', () => {
    const result = runRetirementSimulation(mkState(), { trials: 1 });
    // The target FIRE number is in retirement-year dollars and must be
    // discounted back before comparing to each year's portfolio.
    expect(result.fireAgeAchievable).not.toBeNull();
    expect(result.fireAgeAchievable!).toBeLessThan(mkState().targetRetirementAge);
  });
});

describe('Mortgage milestone year', () => {
  it('stamps the payoff at the current year (not +1)', () => {
    const result = runRetirementSimulation(
      mkState({
        housingType: 'mortgage',
        mortgageBalance: 50000,
        mortgageMonthly: 1500,
        mortgageInterestRate: 6,
        mortgageRemainingYears: 30,
      }),
      { trials: 1 }
    );
    const paid = result.yearlyProjections.find((p) => p.totalDebtBalance <= 0)!;
    const milestone = result.yearlyProjections
      .flatMap((p) => p.milestones)
      .find((m) => m.title.includes('Mortgage'))!;
    expect(milestone.age).toBe(paid.age);
    expect(milestone.year).toBe(paid.year);
  });
});

describe('applyMortgageYear boundary', () => {
  it('never produces a negative balance', () => {
    const result = runRetirementSimulation(
      mkState({
        housingType: 'mortgage',
        mortgageBalance: 1000,
        mortgageMonthly: 5000,
        mortgageInterestRate: 6,
        mortgageRemainingYears: 30,
      }),
      { trials: 1 }
    );
    for (const p of result.yearlyProjections) {
      expect(p.totalDebtBalance).toBeGreaterThanOrEqual(0);
    }
  });
});