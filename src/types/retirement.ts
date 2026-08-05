export type RealIncomeGrowthMode = 'standard_2' | 'aggressive_5' | 'custom';
export type InflationMode = 'fixed_3' | 'custom' | 'historical_replay';
export type ReturnMode = 'deterministic' | 'historical_real' | 'monte_carlo';
export type SchoolType = 'public' | 'private_k12';
export type CollegeTier = 'in_state' | 'private' | 'none';
export type HousingType = 'rent' | 'mortgage';
export type LifestyleTier = 'minimalist' | 'moderate' | 'luxury' | 'custom';

export interface DebtItem {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // percentage, e.g. 5.5
  monthlyPayment: number;
}

export interface ChildItem {
  id: string;
  name: string;
  currentAge: number;
  schoolType: SchoolType;
  privateAnnualCost: number;
  collegeTier: CollegeTier;
  collegeYears: number;
  collegeAnnualCost: number;
}

export interface CustomExpenseCategory {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface RetirementState {
  // Section A: Demographics & Timeline
  currentAge: number;
  targetRetirementAge: number;
  lifeExpectancy: number;

  // Section B: Current Financial Baseline
  liquidCash: number;
  taxableInvestments: number;
  preTax401k: number;
  postTaxRothHsa: number;
  debts: DebtItem[];

  // Section C: Income & Growth Trajectory
  currentAnnualIncome: number;
  realIncomeGrowthMode: RealIncomeGrowthMode;
  customIncomeGrowthRate: number; // percentage
  savingsRatePct: number; // e.g., 20%
  fixedAnnualContribution: number; // optional fixed $ amount override
  useFixedContribution: boolean;
  contributionSplit: {
    preTaxPct: number;
    postTaxPct: number;
    taxablePct: number;
  };

  // Section D: Inflation & Market Assumptions
  inflationMode: InflationMode;
  customInflationRate: number; // percentage
  historicalInflationPreset: string; // key in presets

  stockPct: number;
  bondPct: number;
  cashPct: number;

  returnMode: ReturnMode;
  customStockReturn: number; // percentage, e.g. 7
  customBondReturn: number; // percentage, e.g. 3.5

  // Section E: Dependents & Education
  hasChildren: boolean;
  children: ChildItem[];

  // Section F: Housing & Lifestyle
  housingType: HousingType;
  rentMonthly: number;
  rentInflationPct: number;
  mortgageBalance: number;
  mortgageMonthly: number;
  mortgageInterestRate: number;
  mortgageRemainingYears: number;

  lifestyleTier: LifestyleTier;
  essentialExpensesMonthly: number;
  discretionaryExpensesMonthly: number;
  customCategories: CustomExpenseCategory[];

  // Section G: Retirement Location & COL
  targetLocationId: string;
  colAdjustmentPct: number; // -50 to +50, adjusts COL within chosen location
  socialSecurityMonthlyAt67: number;
  socialSecurityStartAge: number;
  pensionMonthly: number;
  pensionStartAge: number;
}

export interface TimelineMilestone {
  age: number;
  year: number;
  title: string;
  description: string;
  icon: string;
  category: 'education' | 'housing' | 'retirement' | 'income' | 'debt';
}

export interface YearlyProjection {
  year: number;
  age: number;
  isRetired: boolean;
  
  // Percentiles for Net Worth
  netWorth50: number; // Target case (50th percentile)
  netWorth95: number; // Conservative (95th percentile)
  netWorth10: number; // Stress test (10th percentile)

  // Portfolio components for Target case
  liquidCash: number;
  taxableInvestments: number;
  preTaxAccount: number;
  postTaxAccount: number;
  totalDebtBalance: number;
  totalPortfolio: number;

  // Annual Cash Flows
  grossIncome: number;
  totalContributions: number;
  livingExpenses: number;
  housingExpenses: number;
  childEducationExpenses: number;
  debtPayments: number;
  totalExpenses: number;
  guaranteedRetirementIncome: number; // Social Security + Pension
  netWithdrawalNeeded: number;

  milestones: TimelineMilestone[];
}

export interface SimulationResult {
  yearlyProjections: YearlyProjection[];
  successRate: number; // 0 - 100 percentage
  targetRetirementNetWorth: number;
  finalNetWorthAge90: number;
  fireAgeAchievable: number | null;
  safeWithdrawalRatePct: number;
  monthlyRetirementSpending: number;
  baselineLocationName: string;
  targetLocationName: string;
  colMultiplier: number;
}
