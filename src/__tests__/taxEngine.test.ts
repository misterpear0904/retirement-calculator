// @vitest-environment node
// Tax engine verification against primary-source TY2026 figures
// (Rev. Proc. 2025-32: brackets/standard deduction/LTCG breakpoints;
// SSA two-tier early-reduction and 8%/yr delayed-credit formulas;
// CMS 2026 Medicare premium fact sheet; SECURE 2.0 RMD cohorts).
import { describe, it, expect } from 'vitest';
import {
  ssClaimFactor,
  spousalClaimFactor,
  federalOrdinaryTax,
  federalGainsTax,
  taxableSocialSecurity,
  STANDARD_DEDUCTION,
  rmdDivisor,
  rmdStartAgeForBirthYear,
  medicareTierIndex,
  medicarePremiums,
  seniorDeduction,
  calcWithdrawalTaxes,
} from '../utils/taxEngine';

describe('Social Security claim factors (real SSA formula)', () => {
  it('reduces benefits 5/9 of 1% per month for the first 36 early months', () => {
    expect(ssClaimFactor(62)).toBeCloseTo(0.7, 4); // 60 mo early: 0.20 reduction
    expect(ssClaimFactor(63)).toBeCloseTo(0.75, 6); // 48 mo: 20 + 12×(5/12)%
    expect(ssClaimFactor(64)).toBeCloseTo(0.8, 6); // 36 mo: exactly 20%
  });
  it('reduces 5/12 of 1% per month beyond 36 months', () => {
    expect(ssClaimFactor(65)).toBeCloseTo(0.8666667, 4);
    expect(ssClaimFactor(66)).toBeCloseTo(0.9333333, 4);
  });
  it('is 1.00 at full retirement age 67', () => {
    expect(ssClaimFactor(67)).toBe(1);
  });
  it('adds 8%/yr delayed credits up to age 70 only', () => {
    expect(ssClaimFactor(68)).toBeCloseTo(1.08, 6);
    expect(ssClaimFactor(69)).toBeCloseTo(1.16, 6);
    expect(ssClaimFactor(70)).toBeCloseTo(1.24, 6);
    expect(ssClaimFactor(72)).toBeCloseTo(1.24, 6); // capped at 3 years
  });
});

describe('Spousal claim factors (fraction of the 50% share)', () => {
  it('is 25% off for spousal claiming at 62 and phases monthly before 67', () => {
    expect(spousalClaimFactor(62)).toBeCloseTo(0.65, 6); // 60 mo early
    expect(spousalClaimFactor(65)).toBeCloseTo(0.833333, 4); // 24 mo early
    expect(spousalClaimFactor(66)).toBeCloseTo(0.916667, 4);
  });
  it('has no delayed credits', () => {
    expect(spousalClaimFactor(67)).toBe(1);
    expect(spousalClaimFactor(70)).toBe(1);
  });
});

describe('TY2026 ordinary brackets and standard deduction', () => {
  it('uses Rev. Proc. 2025-32 standard deduction amounts', () => {
    expect(STANDARD_DEDUCTION.single).toBe(16100);
    expect(STANDARD_DEDUCTION.joint).toBe(32200);
  });
  it('taxes a simple single-filer income correctly (std deduction applies first)', () => {
    // $30,000 income → $13,900 taxable → 10% bracket + start of 12% bracket
    expect(federalOrdinaryTax(30000, 'single')).toBeCloseTo(1420, 2);
  });
  it('handles the top bracket (single $700,000)', () => {
    const taxable = 700000 - STANDARD_DEDUCTION.single; // 683,900
    const expected =
      taxable * 0.37 +
      (640600 - 256225) * (0.35 - 0.37) +
      (256225 - 201775) * (0.32 - 0.37) +
      (201775 - 105700) * (0.24 - 0.37) +
      (105700 - 50400) * (0.22 - 0.37) +
      (50400 - 12400) * (0.12 - 0.37) +
      12400 * (0.1 - 0.37);
    expect(federalOrdinaryTax(700000, 'single')).toBeCloseTo(expected, 2);
  });
  it('zero tax below the standard deduction', () => {
    expect(federalOrdinaryTax(10000, 'single')).toBe(0);
    expect(federalOrdinaryTax(30000, 'joint')).toBe(0);
  });
  it('double brackets make a joint filer pay less than the same income as single', () => {
    expect(federalOrdinaryTax(200000, 'joint')).toBeLessThan(federalOrdinaryTax(200000, 'single'));
  });
});

describe('Long-term capital-gains bands (TY2026)', () => {
  it('keeps gains within the 0% band untaxed', () => {
    expect(federalGainsTax(49450, 0, 'single')).toBe(0);
    expect(federalGainsTax(98900, 0, 'joint')).toBe(0);
  });
  it('splits gains correctly across the 0/15/20 bands', () => {
    // ordinary taxable 40000 → room0 = 9450; 20000 gains → 9450 at 0%, rest at 15%
    const tax = federalGainsTax(20000, 40000, 'single');
    expect(tax).toBeCloseTo((20000 - 9450) * 0.15, 2);
    // exceeding the 20% breakpoint
    const tax2 = federalGainsTax(700000, 500000, 'single');
    const at0 = Math.max(0, 49450 - 500000);
    const at15 = Math.min(700000, Math.max(0, 545500 - 500000));
    const at20 = 700000 - at15;
    expect(tax2).toBeCloseTo(at15 * 0.15 + at20 * 0.2, 2);
    expect(at0).toBe(0);
  });
});

describe('Social Security taxation (IRS provisional income formula)', () => {
  it('excludes low-income households entirely', () => {
    expect(taxableSocialSecurity(30000, 0, 'joint')).toBe(0);
    expect(taxableSocialSecurity(20000, 5000, 'single')).toBe(0);
  });
  it('applies 50% then 85% tiers with the add-on cap', () => {
    // joint: other 40000, SS 30000 → provisional 55000 > 44000
    const t = taxableSocialSecurity(30000, 40000, 'joint');
    expect(t).toBeCloseTo(0.85 * (55000 - 44000) + 6000, 2);
    // single: other 45000, SS 20000 → provisional 55000 > 34000 → fully 85%
    const t2 = taxableSocialSecurity(20000, 45000, 'single');
    expect(t2).toBeCloseTo(17000, 2);
  });
});

describe('RMD (SECURE 2.0 cohort ages + Uniform Lifetime Table)', () => {
  it('assigns RMD age 73 for born 1951-1959 and 75 for 1960+', () => {
    expect(rmdStartAgeForBirthYear(1951)).toBe(73);
    expect(rmdStartAgeForBirthYear(1959)).toBe(73);
    expect(rmdStartAgeForBirthYear(1960)).toBe(75);
    expect(rmdStartAgeForBirthYear(1985)).toBe(75);
  });
  it('uses the exact Table III divisors', () => {
    expect(rmdDivisor(72)).toBe(27.4);
    expect(rmdDivisor(73)).toBe(26.5);
    expect(rmdDivisor(74)).toBe(25.5);
    expect(rmdDivisor(75)).toBe(24.6);
    expect(rmdDivisor(80)).toBe(20.2);
    expect(rmdDivisor(90)).toBe(12.2);
    expect(rmdDivisor(120)).toBe(2.0);
    expect(rmdDivisor(125)).toBe(2.0);
    expect(rmdDivisor(71)).toBe(Infinity);
  });
});

describe('Medicare IRMAA (2026 schedule)', () => {
  it('finds the correct tier for single and joint MAGIs', () => {
    expect(medicareTierIndex(109000, 'single')).toBe(0);
    expect(medicareTierIndex(109001, 'single')).toBe(1);
    expect(medicareTierIndex(137000, 'single')).toBe(1);
    expect(medicareTierIndex(274000, 'joint')).toBe(1);
    expect(medicareTierIndex(500000, 'single')).toBe(4);
    expect(medicareTierIndex(500001, 'single')).toBe(5);
    expect(medicareTierIndex(800000, 'joint')).toBe(5);
  });
  it('returns the exact 2026 premium + surcharge amounts', () => {
    const base = medicarePremiums(0, 'single');
    expect(base.partB).toBeCloseTo(202.9, 6);
    expect(base.partDSurcharge).toBe(0);
    const tier5 = medicarePremiums(1000000, 'single');
    expect(tier5.partB).toBeCloseTo(689.9, 6); // 202.90 + 487.00
    expect(tier5.partDSurcharge).toBeCloseTo(91.0, 6);
    const tier4 = medicarePremiums(300000, 'single');
    expect(tier4.partB).toBeCloseTo(649.2, 6);
  });
  it('scales base premiums by the caller-supplied inflation factor', () => {
    expect(medicarePremiums(0, 'single', 2).partB).toBeCloseTo(405.8, 6);
  });
});

describe('OBBB senior deduction ($6,000 per 65+ taxpayer, 2025-2028)', () => {
  it('applies the full amount below the phase-out floor', () => {
    expect(seniorDeduction(1, 50000, 'single', 2026)).toBe(6000);
    expect(seniorDeduction(2, 100000, 'joint', 2026)).toBe(12000);
  });
  it('phases out at 6% of MAGI above $75k single / $150k joint', () => {
    expect(seniorDeduction(1, 100000, 'single', 2026)).toBeCloseTo(6000 - 0.06 * 25000, 6);
    expect(seniorDeduction(2, 200000, 'joint', 2026)).toBeCloseTo(12000 - 0.06 * 50000, 6);
  });
  it('dies out at high MAGI and outside the 2025-2028 window', () => {
    expect(seniorDeduction(1, 200000, 'single', 2026)).toBe(0);
    expect(seniorDeduction(1, 50000, 'single', 2029)).toBe(0);
    expect(seniorDeduction(1, 50000, 'single', 2024)).toBe(0);
  });
  it('is wired into calcWithdrawalTaxes via ages + planYear', () => {
    const inputs = {
      preTaxDraw: 50000,
      taxableDraw: 0,
      pensionAnnual: 0,
      ssAnnual: 0,
      filing: 'single' as const,
      stateTaxPct: 0,
      primaryAge: 68,
      planYear: 2026,
    };
    const withSenior = calcWithdrawalTaxes(inputs);
    const without = calcWithdrawalTaxes({ ...inputs, primaryAge: 55 });
    expect(withSenior.seniorDeduction).toBe(6000);
    // fed tax on (50000 − 22100) vs (50000 − 16100)
    expect(withSenior.federal).toBeCloseTo(3100, 2);
    expect(without.federal).toBeCloseTo(3820, 2);
  });
});
