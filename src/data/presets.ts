import { RetirementState } from '../types/retirement';

export const DEFAULT_STATE: RetirementState = {
  currentAge: 32,
  targetRetirementAge: 60,
  lifeExpectancy: 90,

  liquidCash: 25000,
  taxableInvestments: 65000,
  preTax401k: 120000,
  postTaxRothHsa: 35000,
  debts: [],

  currentAnnualIncome: 145000,
  realIncomeGrowthMode: 'standard_2',
  customIncomeGrowthRate: 2,
  savingsRatePct: 22,
  fixedAnnualContribution: 30000,
  useFixedContribution: false,
  contributionSplit: {
    preTaxPct: 50,
    postTaxPct: 30,
    taxablePct: 20,
  },

  inflationMode: 'fixed_3',
  customInflationRate: 3.0,
  historicalInflationPreset: 'stagflation_1970s',

  stockPct: 80,
  bondPct: 15,
  cashPct: 5,

  returnMode: 'monte_carlo',
  customStockReturn: 9.5,
  customBondReturn: 4.5,

  hasChildren: true,
  children: [
    {
      id: 'child_1',
      name: 'Maya',
      currentAge: 4,
      schoolType: 'public',
      privateAnnualCost: 12000,
      collegeTier: 'in_state',
      collegeYears: 4,
      collegeAnnualCost: 24000,
    },
  ],

  housingType: 'mortgage',
  rentMonthly: 2500,
  rentInflationPct: 3.5,
  mortgageBalance: 380000,
  mortgageMonthly: 2450,
  mortgageInterestRate: 6.2,
  mortgageRemainingYears: 22,

  lifestyleTier: 'moderate',
  essentialExpensesMonthly: 3200,
  discretionaryExpensesMonthly: 1500,
  customCategories: [],

  targetLocationId: 'US_AVERAGE',
  colAdjustmentPct: 0,
  socialSecurityMonthlyAt67: 2800,
  socialSecurityStartAge: 67,
  pensionMonthly: 0,
  pensionStartAge: 65,
};

export type PresetName = 'tech_worker_sf' | 'family_texas' | 'fire_early';

export const PRESET_LABELS: Record<PresetName, string> = {
  tech_worker_sf: 'Tech Worker (SF → Portugal)',
  family_texas: 'Young Family in Texas',
  fire_early: 'Aggressive FIRE at Age 45',
};

export function applyPreset(base: RetirementState, presetName: string): RetirementState {
  if (presetName === 'tech_worker_sf') {
    return {
      ...base,
      currentAge: 29,
      targetRetirementAge: 52,
      currentAnnualIncome: 240000,
      savingsRatePct: 35,
      liquidCash: 45000,
      taxableInvestments: 180000,
      preTax401k: 140000,
      postTaxRothHsa: 50000,
      targetLocationId: 'PT_LISBON',
      housingType: 'rent',
      rentMonthly: 3600,
      essentialExpensesMonthly: 4500,
      discretionaryExpensesMonthly: 2500,
    };
  }
  if (presetName === 'family_texas') {
    return {
      ...base,
      currentAge: 35,
      targetRetirementAge: 62,
      currentAnnualIncome: 160000,
      savingsRatePct: 20,
      targetLocationId: 'TX_AUSTIN',
      mortgageBalance: 420000,
      mortgageMonthly: 2800,
      mortgageRemainingYears: 25,
    };
  }
  if (presetName === 'fire_early') {
    return {
      ...base,
      currentAge: 30,
      targetRetirementAge: 45,
      currentAnnualIncome: 180000,
      savingsRatePct: 55,
      lifestyleTier: 'minimalist',
      essentialExpensesMonthly: 2200,
      discretionaryExpensesMonthly: 800,
      targetLocationId: 'CR_SAN_JOSE',
    };
  }
  return base;
}
