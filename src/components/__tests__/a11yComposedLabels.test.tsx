/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SummaryCards } from '../Dashboard/SummaryCards';
import { BenchmarkCompare } from '../Dashboard/BenchmarkCompare';
import { RetirementState, SimulationResult, YearlyProjection } from '../../types/retirement';

const state = { currentAge: 40, targetRetirementAge: 65, savingsRatePct: 20 } as unknown as RetirementState;

const yearRow = {
  year: 2051, age: 65, isRetired: true, inflationFactor: 1, netWorth50: 1500000,
  netWorth95: 2000000, netWorth10: 900000, liquidCash: 0, taxableInvestments: 0,
  preTaxAccount: 0, postTaxAccount: 0, totalDebtBalance: 0, totalPortfolio: 1500000,
  grossIncome: 0, totalContributions: 0, livingExpenses: 0, housingExpenses: 0,
  childEducationExpenses: 0, healthcareExpenses: 0, debtPayments: 0, totalExpenses: 0,
  guaranteedRetirementIncome: 0, netWithdrawalNeeded: 0, taxPaid: 0, rothConverted: 0,
  spendingCutApplied: false, milestones: [],
} as unknown as YearlyProjection;

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    yearlyProjections: [yearRow],
    successRate: 82,
    targetRetirementNetWorth: 1250000,
    finalNetWorth: 900000,
    fireAgeAchievable: 61,
    coastFireAge: 47,
    retirementAnnualExpense: 60000,
    safeWithdrawalRatePct: 3.8,
    monthlyRetirementSpending: 5000,
    baselineLocationName: 'US Average',
    targetLocationName: 'Lisbon',
    colMultiplier: 0.8,
    lifetimeTaxesPaid: 120000,
    lifetimeRothConverted: 0,
    ...overrides,
  } as unknown as SimulationResult;
}

afterEach(cleanup);

describe('a11y composed labels', () => {
  it('SummaryCards Spend Rate badge has spaced aria-label', () => {
    render(<SummaryCards result={makeResult({ safeWithdrawalRatePct: 3.8 })} state={state} onChange={() => {}} />);
    expect(screen.getByText(/Spend Rate: 3.8%/).closest('[aria-label]')?.getAttribute('aria-label')).toBe('Spend Rate: 3.8%');
  });

  it('SummaryCards monthly spending container has spaced aria-label', () => {
    render(<SummaryCards result={makeResult({ monthlyRetirementSpending: 5000 })} state={state} onChange={() => {}} />);
    expect(document.querySelector('[aria-label*="per month, today"]')).not.toBeNull();
  });

  it('BenchmarkCompare wealth badge has spaced aria-label', () => {
    const s = { ...state, liquidCash: 100000, taxableInvestments: 0, preTax401k: 0, postTaxRothHsa: 0, currentAnnualIncome: 100000 } as unknown as RetirementState;
    render(<BenchmarkCompare state={s} />);
    const el = document.querySelector('[aria-label*="Wealth: top"]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('aria-label')).not.toMatch(/top\d+%/);
  });
});