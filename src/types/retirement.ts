export type RealIncomeGrowthMode = 'standard_2' | 'aggressive_5' | 'custom';
export type InflationMode = 'fixed_3' | 'custom' | 'historical_replay';
export type ReturnMode = 'deterministic' | 'historical_real' | 'historical_replay' | 'monte_carlo';
export type SchoolType = 'public' | 'private_k12';
export type CollegeTier = 'in_state' | 'private' | 'none';
export type HousingType = 'rent' | 'mortgage';
export type LifestyleTier = 'minimalist' | 'moderate' | 'luxury' | 'custom';
export type TaxFilingStatus = 'single' | 'joint';
export type WithdrawalStrategy = 'fixed_order' | 'proportional' | 'guardrails';
export type SpendingStrategy = 'fixed_real' | 'vpw' | 'guyton_klinger' | 'bernicke';

export interface SpendingSmile {
  early: number;  // multiplier for ages < spendingSmileStartAge
  mid: number;    // multiplier for spendingSmileStartAge <= age < spendingSmileMidAge
  late: number;   // multiplier for age >= spendingSmileMidAge
}

export interface PartnerInfo {
  enabled: boolean;
  currentAge: number;
  annualIncome: number;
  lifeExpectancy: number;
  ssMonthlyAt67: number;
  ssStartAge: number;
}

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

  // Section A2: Partner / household (optional second person)
  hasPartner: boolean;
  partner: PartnerInfo;

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

  // Section F2: Healthcare costs (age-graded, grow at medical inflation)
  healthcareMonthlyAt65: number;
  healthcareInflationPct: number;
  healthcareStartAge: number;
  /** Add Medicare Part B + IRMAA premiums (2026 schedule) from age 65. */
  includeMedicarePremiums: boolean;

  // Section H: Tax strategy & decumulation
  taxFilingStatus: TaxFilingStatus;
  withdrawalStrategy: WithdrawalStrategy;
  guardrailCutPct: number; // spending cut applied after a down year (guardrails strategy)
  /** Dynamic retirement spending strategy (default fixed_real = current behavior). */
  spendingStrategy?: SpendingStrategy;
  useRothConversions: boolean;
  rothConversionAnnual: number;
  rothConversionStartAge: number;
  rothConversionEndAge: number;

  // Section H2: Spending smile (early/mid/late retirement multipliers)
  spendingSmile: SpendingSmile;
  spendingSmileStartAge: number; // age when "early" ends
  spendingSmileMidAge: number;   // age when "mid" ends

  // Section G: Retirement Location & COL
  targetLocationId: string;
  colAdjustmentPct: number; // -50 to +50, adjusts COL within chosen location
  socialSecurityMonthlyAt67: number;
  socialSecurityStartAge: number;
  pensionMonthly: number;
  pensionStartAge: number;
}

export type MilestoneIcon = 'Palmtree' | 'Landmark' | 'Home' | 'GraduationCap' | 'Calendar';

export interface TimelineMilestone {
  age: number;
  year: number;
  title: string;
  description: string;
  icon: MilestoneIcon | string;
  category: 'education' | 'housing' | 'retirement' | 'income' | 'debt';
}

export interface YearlyProjection {
  year: number;
  age: number;
  isRetired: boolean;
  /** Cumulative inflation factor from today to this year (1.0 at start). */
  inflationFactor: number;
  
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
  healthcareExpenses: number;
  debtPayments: number;
  totalExpenses: number;
  guaranteedRetirementIncome: number; // Social Security + Pension
  netWithdrawalNeeded: number;
  taxPaid: number; // income + capital-gains + state tax settled that year
  rothConverted: number; // pre-tax -> Roth amount moved that year
  spendingCutApplied: boolean; // guardrails cut active that year

  milestones: TimelineMilestone[];
}

export interface SimulationResult {
  yearlyProjections: YearlyProjection[];
  successRate: number; // 0 - 100 percentage
  targetRetirementNetWorth: number;
  /** Net worth at the end of the plan horizon (lifeExpectancy). */
  finalNetWorth: number;
  fireAgeAchievable: number | null;
  /**
   * Earliest age where the portfolio could reach the FIRE number by the
   * target retirement age even with no further contributions ("Coast FIRE").
   * Null when never reached before retirement.
   */
  coastFireAge: number | null;
  /** Annual retirement spending in the retirement year (inflated, nominal $). */
  retirementAnnualExpense: number;
  safeWithdrawalRatePct: number;
  monthlyRetirementSpending: number;
  baselineLocationName: string;
  targetLocationName: string;
  colMultiplier: number;
  lifetimeTaxesPaid: number;
  lifetimeRothConverted: number;
  /** Percent of historical start-year sequences in which the plan did not run out. */
  historicalSuccessRate?: number;
  /** Alias for historicalSuccessRate. */
  historicalRealSuccessRate?: number;
  /** Per-age longevity probabilities (Engaging-Data style). */
  longevityProbabilities?: Array<{
    age: number;
    aliveWithMoney: number;
    aliveBroke: number;
    deceased: number;
  }>;
  /** Lifetime tax delta (conversions on minus off) when Roth conversions are modeled. */
  lifetimeTaxDeltaVsNoConversion?: number;
}
