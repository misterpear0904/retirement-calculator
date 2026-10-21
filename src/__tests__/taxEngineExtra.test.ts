import { describe, it, expect } from 'vitest';
import { medicareTierIndex, seniorDeduction, calcWithdrawalTaxes, bracketFill } from '../utils/taxEngine';

describe('taxEngine extra', () => {
  it('medicareTierIndex high magi returns last', () => {
    const n = medicareTierIndex(10_000_000, 'single');
    expect(n).toBeGreaterThan(0);
  });
  it('seniorDeduction zero outside window', () => {
    expect(seniorDeduction(1, 50000, 'single', 2024)).toBe(0);
    expect(seniorDeduction(0, 50000, 'single', 2026)).toBe(0);
  });
  it('seniorDeduction phaseout', () => {
    const v = seniorDeduction(2, 300000, 'joint', 2026);
    expect(v).toBeLessThan(12000);
  });
  it('calcWithdrawalTaxes no senior', () => {
    const r = calcWithdrawalTaxes({
      preTaxDraw: 10000,
      taxableDraw: 5000,
      pensionAnnual: 0,
      ssAnnual: 12000,
      filing: 'single',
      stateTaxPct: 5,
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.seniorDeduction).toBe(0);
  });
  it('calcWithdrawalTaxes with senior', () => {
    const r = calcWithdrawalTaxes({
      preTaxDraw: 10000,
      taxableDraw: 5000,
      pensionAnnual: 0,
      ssAnnual: 12000,
      filing: 'single',
      stateTaxPct: 5,
      primaryAge: 70,
      planYear: 2026,
    });
    expect(r.seniorDeduction).toBeGreaterThan(0);
  });
});
