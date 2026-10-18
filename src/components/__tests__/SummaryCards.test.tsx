/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SummaryCards } from '../Dashboard/SummaryCards';
import { RetirementState, SimulationResult, YearlyProjection } from '../../types/retirement';

const state: RetirementState = {
  currentAge: 40,
  targetRetirementAge: 65,
  savingsRatePct: 20,
} as unknown as RetirementState;

const yearRow: YearlyProjection = {
  year: 2051,
  age: 65,
  isRetired: true,
  inflationFactor: 1,
  netWorth50: 1_500_000,
  netWorth95: 2_000_000,
  netWorth10: 900_000,
  liquidCash: 0,
  taxableInvestments: 0,
  preTaxAccount: 0,
  postTaxAccount: 0,
  totalDebtBalance: 0,
  totalPortfolio: 1_500_000,
  grossIncome: 0,
  totalContributions: 0,
  livingExpenses: 0,
  housingExpenses: 0,
  childEducationExpenses: 0,
  healthcareExpenses: 0,
  debtPayments: 0,
  totalExpenses: 0,
  guaranteedRetirementIncome: 0,
  netWithdrawalNeeded: 0,
  taxPaid: 0,
  rothConverted: 0,
  spendingCutApplied: false,
  milestones: [],
};

function makeResult(overrides: Partial<SimulationResult>): SimulationResult {
  return {
    yearlyProjections: [yearRow],
    successRate: 82,
    targetRetirementNetWorth: 1_250_000,
    finalNetWorth: 900_000,
    fireAgeAchievable: 61,
    coastFireAge: 47,
    retirementAnnualExpense: 60_000,
    safeWithdrawalRatePct: 3.8,
    monthlyRetirementSpending: 5_000,
    baselineLocationName: 'US Average',
    targetLocationName: 'Lisbon',
    colMultiplier: 0.8,
    lifetimeTaxesPaid: 120_000,
    lifetimeRothConverted: 0,
    ...overrides,
  };
}

function renderCards(result: SimulationResult) {
  return render(<SummaryCards result={result} state={state} onChange={() => {}} />);
}

afterEach(cleanup);

describe('SummaryCards — Coast FIRE tile', () => {
  it('shows the Coast FIRE age with the explainer when coastFireAge is set', () => {
    renderCards(makeResult({ coastFireAge: 47 }));
    expect(screen.getByText('Coast FIRE')).toBeTruthy();
    expect(screen.getByText('Age 47')).toBeTruthy();
    expect(
      screen.getByText(/earliest you could stop contributing and still hit FIRE/i)
    ).toBeTruthy();
  });

  it('renders "Not yet" when coastFireAge is null', () => {
    renderCards(makeResult({ coastFireAge: null }));
    expect(screen.getByText('Not yet')).toBeTruthy();
    expect(screen.queryByText('Age 47')).toBeNull();
  });
});

describe('SummaryCards — Spend Rate labeling', () => {
  it('labels the metric "Spend Rate" with the 25x coverage explainer, never "SWR"', () => {
    renderCards(makeResult({ safeWithdrawalRatePct: 3.8 }));
    expect(screen.getByText(/Spend Rate: 3.8%/)).toBeTruthy();
    expect(screen.getByText(/4% = 25× coverage/)).toBeTruthy();
    expect(screen.queryByText(/SWR/)).toBeNull();
    expect(screen.getByText(/\$60,000\/yr/)).toBeTruthy(); // retirementAnnualExpense context
  });

  it('marks the monthly retirement spending figure as today\'s dollars', () => {
    renderCards(makeResult({ monthlyRetirementSpending: 5_000 }));
    expect(screen.getByText('Monthly Retirement Spending')).toBeTruthy();
    expect(screen.getByText(/Today's \$\s*$/i)).toBeTruthy();
  });
});
