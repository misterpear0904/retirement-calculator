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
  // Generous upper bounds that no legitimate plan hits, but which catch
  // paste/typo blowups (e.g. an extra three zeros on a mortgage balance
  // would otherwise swing net worth by tens of millions).
  const MAX_BALANCE = 500_000_000; // $500M per account / debt
  const MAX_YEARLY = 100_000_000; // $100M per year
  const MAX_MONTHLY = 50_000_000; // $50M per month
  const money = (v: number | undefined, cap: number = MAX_BALANCE, fallback = 0) =>
    Math.min(cap, Math.max(0, Number.isFinite(v) ? (v as number) : fallback));

  const currentAge = Math.round(clamp(state.currentAge, VALIDATION_LIMITS.MIN_AGE, VALIDATION_LIMITS.MAX_AGE, 32));  const lifeExpectancy = Math.round(
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
    savingsRatePct: clamp(state.savingsRatePct, VALIDATION_LIMITS.MIN_SAVINGS_RATE_PCT, VALIDATION_LIMITS.MAX_SAVINGS_RATE_PCT, 20),    colAdjustmentPct: clamp(
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
    mortgageBalance: money(state.mortgageBalance, MAX_BALANCE),
    mortgageMonthly: money(state.mortgageMonthly, MAX_MONTHLY),
    rentMonthly: money(state.rentMonthly, MAX_MONTHLY),
    rentInflationPct: clamp(state.rentInflationPct ?? 3.5, 0, 50, 3.5),
    liquidCash: money(state.liquidCash),
    taxableInvestments: money(state.taxableInvestments),
    preTax401k: money(state.preTax401k),
    postTaxRothHsa: money(state.postTaxRothHsa),
    currentAnnualIncome: money(state.currentAnnualIncome, MAX_YEARLY),
    fixedAnnualContribution: money(state.fixedAnnualContribution, MAX_YEARLY),
    essentialExpensesMonthly: money(state.essentialExpensesMonthly, MAX_MONTHLY),
    discretionaryExpensesMonthly: money(state.discretionaryExpensesMonthly, MAX_MONTHLY),
    socialSecurityMonthlyAt67: money(state.socialSecurityMonthlyAt67, MAX_MONTHLY),
    pensionMonthly: money(state.pensionMonthly, MAX_MONTHLY),
    customInflationRate: clamp(state.customInflationRate ?? 3, -10, 50, 3),
    customIncomeGrowthRate: clamp(state.customIncomeGrowthRate ?? 2, -20, 50, 2),
    customStockReturn: clamp(state.customStockReturn ?? 9.5, -50, 100, 9.5),
    customBondReturn: clamp(state.customBondReturn ?? 4.5, -50, 100, 4.5),
    mortgageInterestRate: clamp(state.mortgageInterestRate ?? 6, 0, 30, 6),
    debts: (state.debts ?? []).map((d) => ({
      ...d,
      balance: money(d.balance, MAX_BALANCE),
      monthlyPayment: money(d.monthlyPayment, MAX_MONTHLY),
      interestRate: clamp(d.interestRate ?? 0, 0, 100, 0),
    })),
    children: (state.children ?? []).map((c) => ({
      ...c,
      privateAnnualCost: money(c.privateAnnualCost, MAX_YEARLY),
      collegeAnnualCost: money(c.collegeAnnualCost, MAX_YEARLY),
    })),
    customCategories: (state.customCategories ?? []).map((c) => ({
      ...c,
      monthlyAmount: money(c.monthlyAmount, MAX_MONTHLY),
    })),
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
