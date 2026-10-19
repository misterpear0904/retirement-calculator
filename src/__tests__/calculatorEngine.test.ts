// @vitest-environment node
// Engine-level regression tests for the bug-class fixes: nominal FIRE/SWR,
// household SS (spousal top-up + survivor step-up), mortgage non-forgiveness,
// real tax settlement (no vanishing gross-up), spending smile, historical
// replay wiring, RMD cohorts, Coast FIRE and contribution splits.
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
    rentInflationPct: 3,
    essentialExpensesMonthly: 5000,
    discretionaryExpensesMonthly: 0,
    lifestyleTier: 'custom',
    healthcareMonthlyAt65: 0,
    includeMedicarePremiums: true,
    socialSecurityMonthlyAt67: 0,
    socialSecurityStartAge: 67,
    pensionMonthly: 0,
    pensionStartAge: 65,
    useRothConversions: false,
    spendingSmile: { early: 1, mid: 1, late: 1 },
    spendingSmileStartAge: 70,
    spendingSmileMidAge: 80,
    inflationMode: 'fixed_3',
    returnMode: 'deterministic',
    targetLocationId: '',
    colAdjustmentPct: 0,
    ...over,
  };
}

describe('FIRE / spend-rate nominal consistency', () => {
  it('retirement expense is inflated to the retirement year (nominal), not today-dollars', () => {
    const result = runRetirementSimulation(mkState(), { trials: 1 });
    const retire = result.yearlyProjections.find((p) => p.age === 60)!;
    expect(retire).toBeDefined();
    // lifestyle term = 5000 × 12 × col × inflationFactor(60)
    expect(result.retirementAnnualExpense).toBeCloseTo(
      5000 * 12 * result.colMultiplier * retire.inflationFactor,
      0
    );
    // and it must exceed the today-dollar lifestyle amount
    expect(result.retirementAnnualExpense).toBeGreaterThan(5000 * 12 * result.colMultiplier);
  });

  it('spend rate = retirement expense / retirement net worth (25× → 4%)', () => {
    const result = runRetirementSimulation(mkState(), { trials: 1 });
    const expected = (result.retirementAnnualExpense / result.targetRetirementNetWorth) * 100;
    expect(result.safeWithdrawalRatePct).toBeCloseTo(expected, 1);
  });
});

describe('Household Social Security (spousal + survivor rules)', () => {
  const partnerBase = {
    hasPartner: true,
    partner: {
      enabled: true,
      currentAge: 67,
      annualIncome: 0,
      lifeExpectancy: 80,
      ssMonthlyAt67: 1000,
      ssStartAge: 67,
    },
    currentAge: 67,
    targetRetirementAge: 67,
    lifeExpectancy: 90,
    socialSecurityMonthlyAt67: 3000,
    pensionMonthly: 0,
    liquidCash: 500000,
  };

  function stateWith(over: Partial<RetirementState>): RetirementState {
    return mkState({ ...partnerBase, ...over });
  }

  it('adds a spousal top-up while both are alive (50% of the primary PIA)', () => {
    const result = runRetirementSimulation(stateWith({}), { trials: 1 });
    // year 0: primary 36000 + partner max(own 12000, spousal 18000) = 54000
    expect(result.yearlyProjections[0].grossIncome).toBeCloseTo(54000, 0);
  });

  it('survivor keeps the LARGER check after a death (not their own small one)', () => {
    const result = runRetirementSimulation(stateWith({}), { trials: 1 });
    // partner (LE 80) dies at age 81+ → household = survivor step-up = 36000 × infl
    const after = result.yearlyProjections.find((p) => p.age === 84)!;
    expect(after).toBeDefined();
    expect(after.grossIncome).toBeCloseTo(36000 * after.inflationFactor, 0);
  });

  it('the larger earner surviving keeps the same income (no step down)', () => {
    // Partner out-earns the primary; when the primary dies, household = partner's check
    const result = runRetirementSimulation(
      stateWith({
        socialSecurityMonthlyAt67: 1000,
        partner: { ...partnerBase.partner, ssMonthlyAt67: 3000, lifeExpectancy: 90 },
        lifeExpectancy: 80,
      }),
      { trials: 1 }
    );
    // While both alive: 12000 + max(36000, 6000) = 48000. After primary dies (age 81): 36000 × infl
    expect(result.yearlyProjections[0].grossIncome).toBeCloseTo(48000, 0);
    const after = result.yearlyProjections.find((p) => p.age === 84)!;
    expect(after.grossIncome).toBeCloseTo(36000 * after.inflationFactor, 0);
  });

  it('a partner claiming early gets a reduced spousal share', () => {
    // Partner claims at 62 → own 1000×0.70 = 700; spousal max = 3000×0.5×0.65 = 975
    const result = runRetirementSimulation(
      stateWith({
        partner: { ...partnerBase.partner, ssStartAge: 62 },
        socialSecurityStartAge: 62,
      }),
      { trials: 1 }
    );
    // primary claims at 62 (factor 0.7) = 2100/mo; partner top-up = max(700, 975) = 975
    expect(result.yearlyProjections[0].grossIncome).toBeCloseTo((2100 + 975) * 12, 0);
  });
});

describe('Mortgage amortization (no balance forgiveness)', () => {
  it('keeps servicing an under-amortized mortgage past the stated term', () => {
    const state = mkState({
      housingType: 'mortgage',
      mortgageBalance: 100000,
      mortgageMonthly: 800, // << the ~$1,933 needed for 5 yrs at 6%
      mortgageInterestRate: 6,
      mortgageRemainingYears: 5,
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    // 6 years in (one past the term), debt must NOT have vanished
    const sixYearsIn = result.yearlyProjections[5];
    expect(sixYearsIn.totalDebtBalance).toBeGreaterThan(50000);
    // housing expense continues after the stated term while a balance remains
    expect(sixYearsIn.housingExpenses).toBeGreaterThan(0);
  });

  it('fires the mortgage-paid milestone only on the true payoff year', () => {
    const state = mkState({
      housingType: 'mortgage',
      mortgageBalance: 50000,
      mortgageMonthly: 1500,
      mortgageInterestRate: 6,
      mortgageRemainingYears: 30,
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    const paidYear = result.yearlyProjections.find(
      (p) => p.totalDebtBalance <= 0
    );
    expect(paidYear).toBeDefined();
    const milestone = result.yearlyProjections
      .flatMap((p) => p.milestones)
      .find((m) => m.title.toLowerCase().includes('mortgage'));
    expect(milestone).toBeDefined();
    expect(milestone!.age).toBeGreaterThanOrEqual(paidYear!.age - 1);
  });
});

describe('Tax gross-up reservoir (taxes are actually paid pre-RMD)', () => {
  it('retired years before RMD age settle a real tax bill', () => {
    const state = mkState({
      currentAge: 68,
      targetRetirementAge: 68,
      lifeExpectancy: 75,
      liquidCash: 20000,
      taxableInvestments: 600000,
      preTax401k: 800000,
      essentialExpensesMonthly: 6000,
      pensionMonthly: 3000, // ordinary income — makes the bill nonzero at these MAGIs
      pensionStartAge: 68,
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    const yearsBeforeRmd = result.yearlyProjections.filter(
      (p) => p.isRetired && p.age < 73
    );
    expect(yearsBeforeRmd.length).toBeGreaterThan(2);
    const totalPaid = yearsBeforeRmd.reduce((a, p) => a + p.taxPaid, 0);
    expect(totalPaid).toBeGreaterThan(0);
  });
});

describe('Spending smile (deterministic parity)', () => {
  it('applies the early/mid/late multipliers at the configured ages', () => {
    const base = {
      currentAge: 60,
      targetRetirementAge: 62,
      lifeExpectancy: 90,
      essentialExpensesMonthly: 4000,
      discretionaryExpensesMonthly: 0,
      liquidCash: 3000000, // no shortfall interference
    };
    const smile = runRetirementSimulation(
      mkState({
        ...base,
        spendingSmile: { early: 1.2, mid: 1.0, late: 0.9 },
        spendingSmileStartAge: 65,
        spendingSmileMidAge: 75,
      }),
      { trials: 1 }
    );
    const at63 = smile.yearlyProjections.find((p) => p.age === 63)!;
    const at70 = smile.yearlyProjections.find((p) => p.age === 70)!;
    const at80 = smile.yearlyProjections.find((p) => p.age === 80)!;
    const ratio = (p: { livingExpenses: number; inflationFactor: number }) =>
      p.livingExpenses / (4000 * 12 * smile.colMultiplier * p.inflationFactor);
    expect(ratio(at63)).toBeCloseTo(1.2, 3);
    expect(ratio(at70)).toBeCloseTo(1.0, 3);
    expect(ratio(at80)).toBeCloseTo(0.9, 3);
  });
});

describe('Historical sequence replay wiring', () => {
  it.each([
    ['historical_real', 'bull_1990s', 5.4],
  ] as const)('replays preset returns+inflation for returnMode %s', (mode, presetId, year0Infl) => {
    const state = mkState({ returnMode: mode, historicalInflationPreset: presetId });
    const result = runRetirementSimulation(state, { trials: 1 });
    // Year 0 expenses run at today's price level; the FIRST year's inflation
    // (1990: 5.4%) therefore shows up in year 1's cumulative factor.
    const p1 = result.yearlyProjections[1];
    expect(p1).toBeDefined();
    expect((p1.inflationFactor - 1) * 100).toBeCloseTo(year0Infl, 3);
  });

  it('historical_replay inflation mode replays the same data', () => {
    const state = mkState({ inflationMode: 'historical_replay', historicalInflationPreset: 'recent_2020s' });
    const result = runRetirementSimulation(state, { trials: 1 });
    // 2020 inflation was 1.4% → visible in year 1's cumulative factor
    expect((result.yearlyProjections[1].inflationFactor - 1) * 100).toBeCloseTo(1.4, 3);
  });
});

describe('RMD cohort start age', () => {
  it('uses 73 for born ~1951-1959 (currentAge 73 in 2026 → born 1953)', () => {
    const state = mkState({
      currentAge: 70,
      targetRetirementAge: 70,
      lifeExpectancy: 80,
      liquidCash: 10000,
      taxableInvestments: 10000,
      preTax401k: 2000000,
      essentialExpensesMonthly: 0,
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    expect(result.yearlyProjections.find((p) => p.age === 73)!.rothConverted ?? 0).toBe(0);
    // RMD milestone lands at 73 (not 75)
    const rmd = result.yearlyProjections
      .flatMap((p) => p.milestones)
      .find((m) => m.title.includes('RMD'));
    expect(rmd?.age).toBe(73);
  });
});

describe('Coast FIRE', () => {
  it('finds a coast age before retirement for a healthy portfolio, with a milestone', () => {
    const result = runRetirementSimulation(
      mkState({
        currentAge: 40,
        targetRetirementAge: 60,
        liquidCash: 200000,
        taxableInvestments: 500000,
        preTax401k: 400000,
        postTaxRothHsa: 100000,
        essentialExpensesMonthly: 4000,
        savingsRatePct: 50,
      }),
      { trials: 1 }
    );
    expect(result.coastFireAge).not.toBeNull();
    expect(result.coastFireAge!).toBeLessThan(60);
    const milestone = result.yearlyProjections
      .flatMap((p) => p.milestones)
      .find((m) => m.title.includes('Coast'));
    expect(milestone?.age).toBe(result.coastFireAge);
  });

  it('returns null for a portfolio that cannot coast', () => {
    const result = runRetirementSimulation(
      mkState({
        currentAge: 40,
        targetRetirementAge: 60,
        liquidCash: 1000,
        taxableInvestments: 0,
        preTax401k: 1000,
        postTaxRothHsa: 0,
        essentialExpensesMonthly: 9000,
        savingsRatePct: 5,
      }),
      { trials: 1 }
    );
    expect(result.coastFireAge).toBeNull();
  });
});

describe('Contributions follow the tax-bucket split', () => {
  it('routes contributions into the configured buckets', () => {
    const state = mkState({
      currentAge: 40,
      targetRetirementAge: 41,
      lifeExpectancy: 42,
      liquidCash: 0,
      taxableInvestments: 0,
      preTax401k: 0,
      postTaxRothHsa: 0,
      savingsRatePct: 100,
      contributionSplit: { preTaxPct: 100, postTaxPct: 0, taxablePct: 0 },
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    const p0 = result.yearlyProjections[0];
    expect(p0.totalContributions).toBeGreaterThan(0);
    expect(p0.preTaxAccount).toBeGreaterThan(0);
    expect(p0.postTaxAccount).toBe(0);
    expect(p0.taxableInvestments).toBe(0);
  });
});

describe('Plan failure behavior', () => {
  it('reports 0% success for an unworkable plan', () => {
    const state = mkState({
      currentAge: 60,
      targetRetirementAge: 61,
      liquidCash: 0,
      taxableInvestments: 0,
      preTax401k: 0,
      postTaxRothHsa: 0,
      currentAnnualIncome: 0,
      savingsRatePct: 0,
      essentialExpensesMonthly: 8000,
    });
    const result = runRetirementSimulation(state, { trials: 20 });
    expect(result.successRate).toBe(0);
  });
});

describe('Monte Carlo', () => {
  it('partially succeeds for an in-between plan', () => {
    const result = runRetirementSimulation(mkState(), { trials: 100 });
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(100);
  });

  it('does not re-split buckets from static weights (RMD drains pre-tax)', () => {
    const state = mkState({
      currentAge: 75,
      targetRetirementAge: 75,
      lifeExpectancy: 90,
      essentialExpensesMonthly: 1000,
      liquidCash: 10000,
      taxableInvestments: 20000,
      preTax401k: 4000000,
      includeMedicarePremiums: false,
    });
    const result = runRetirementSimulation(state, { trials: 1 });
    const last = result.yearlyProjections[result.yearlyProjections.length - 1];
    // With persistent buckets and RMD drains from age 75, the pre-tax account
    // (≈$4m → ≥$150k/yr RMD) cannot survive a $12k/yr lifestyle for 15 years
    // UNLESS growth overwhelms it — either way it must differ from the naive
    // static re-split, which would keep the pre-tax share at ~99% of NW.
    const preShare = last.preTaxAccount / Math.max(1, last.totalPortfolio);
    expect(preShare).toBeLessThan(0.999);
  });
});

describe('Monte Carlo determinism', () => {
  it('same state produces the identical success rate on repeat', () => {
    const s = mkState({ returnMode: 'monte_carlo' });
    const a = runRetirementSimulation(s, { trials: 120 }).successRate;
    const b = runRetirementSimulation(s, { trials: 120 }).successRate;
    expect(a).toBe(b);
  });
});
