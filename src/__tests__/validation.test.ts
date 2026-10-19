// @vitest-environment node
// Validation shield: hostile payload handling through the
// sanitizeRetirementState funnel (used by localStorage reloads, share links
// and file imports).
import { describe, it, expect } from 'vitest';
import { sanitizeRetirementState, validateRetirementState } from '../utils/validation';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState } from '../types/retirement';

const asState = (o: unknown): RetirementState => o as RetirementState;
const clone = (o: unknown) => JSON.parse(JSON.stringify(o));

describe('sanitizeRetirementState — hostile payloads', () => {
  it('survives non-array debts and repairs them to []', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.debts = { evil: true } as unknown as RetirementState['debts'];
    const out = sanitizeRetirementState(s);
    expect(Array.isArray(out.debts)).toBe(true);
  });

  it('coerces NaN/Infinity numerics to safe defaults', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.currentAge = NaN;
    s.liquidCash = -50000;
    s.mortgageMonthly = Number.POSITIVE_INFINITY;
    const out = sanitizeRetirementState(s);
    expect(Number.isFinite(out.currentAge)).toBe(true);
    expect(out.liquidCash).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(out.mortgageMonthly)).toBe(true);
  });

  it('repairs invalid contribution splits (each component clamps to 0-100)', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.contributionSplit = { preTaxPct: 900, postTaxPct: -20, taxablePct: 0 };
    const out = sanitizeRetirementState(s);
    const { preTaxPct, postTaxPct, taxablePct } = out.contributionSplit;
    expect(preTaxPct).toBe(100);
    expect(postTaxPct).toBe(0);
    expect(taxablePct).toBe(0);
  });

  it('repairs invalid enums to valid values', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.withdrawalStrategy = 'liquid_everything' as unknown as RetirementState['withdrawalStrategy'];
    s.inflationMode = 'cat_scroll' as unknown as RetirementState['inflationMode'];
    s.taxFilingStatus = 'big_hyper' as unknown as RetirementState['taxFilingStatus'];
    s.housingType = 'ys' as unknown as RetirementState['housingType'];
    const out = sanitizeRetirementState(s);
    expect(['fixed_order', 'proportional', 'guardrails']).toContain(out.withdrawalStrategy);
    expect(['fixed_3', 'custom', 'historical_replay']).toContain(out.inflationMode);
    expect(['single', 'joint']).toContain(out.taxFilingStatus);
    expect(['rent', 'mortgage']).toContain(out.housingType);
  });

  it('forces includeMedicarePremiums into a boolean (default true)', () => {
    const base = asState(clone(DEFAULT_STATE));
    base.includeMedicarePremiums = 'yes' as unknown as boolean;
    expect(sanitizeRetirementState(base).includeMedicarePremiums).toBe(true);
    const s2 = asState(clone(DEFAULT_STATE));
    s2.includeMedicarePremiums = false;
    expect(sanitizeRetirementState(s2).includeMedicarePremiums).toBe(false);
    delete (s2 as unknown as Record<string, unknown>).includeMedicarePremiums;
    expect(sanitizeRetirementState(s2).includeMedicarePremiums).toBe(true);
  });

  it('clamps smile multipliers and ages to validation limits', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.spendingSmile = { early: 9, mid: -3, late: 1.05 };
    s.spendingSmileStartAge = 10;
    s.spendingSmileMidAge = 250;
    const out = sanitizeRetirementState(s);
    expect(out.spendingSmile.early).toBeCloseTo(2, 6);
    expect(out.spendingSmile.mid).toBeCloseTo(0.5, 6);
    expect(out.spendingSmile.late).toBeCloseTo(1.05, 6);
    expect(out.spendingSmileStartAge).toBe(60);
    expect(out.spendingSmileStartAge).toBeGreaterThanOrEqual(60);
    expect(out.spendingSmileMidAge).toBe(90);
    expect(out.spendingSmileMidAge).toBeLessThanOrEqual(90);
  });

  it('repairs missing/non-object partner blocks', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.hasPartner = true;
    (s as unknown as Record<string, unknown>).partner = 'nope';
    const out = sanitizeRetirementState(s);
    expect(typeof out.partner).toBe('object');
    expect(out.partner).not.toBeNull();
    expect(Number.isFinite(out.partner.ssMonthlyAt67)).toBe(true);
  });

  it('sanitizes malformed children/debts/customCategories without throwing', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.children = 'nope' as unknown as RetirementState['children'];
    s.debts = 42 as unknown as RetirementState['debts'];
    s.customCategories = { a: 1 } as unknown as RetirementState['customCategories'];
    s.children = [{ currentAge: NaN, schoolType: 'martian', collegeTier: 'gold' } as unknown as RetirementState['children'][number]];
    const out = sanitizeRetirementState(s);
    expect(Array.isArray(out.children)).toBe(true);
    expect(Array.isArray(out.debts)).toBe(true);
    expect(Array.isArray(out.customCategories)).toBe(true);
    expect(out.children[0].schoolType).toBe('public');
    expect(out.children[0].collegeTier).toBe('in_state');
  });

  it('caps array sizes on import', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.debts = Array.from({ length: 200 }, (_, i) => ({ id: `d${i}`, name: `debt${i}`, balance: 1000, monthlyPayment: 50, interestRate: 5 }));
    const out = sanitizeRetirementState(s);
    expect(out.debts.length).toBe(50);
  });
  it('produces JSON-safe output (no NaN leaking into storage)', () => {
    const s = asState(clone(DEFAULT_STATE));
    s.preTax401k = NaN;
    const out = sanitizeRetirementState(s);
    const str = JSON.stringify(out);
    expect(str).not.toContain('NaN');
    expect(str).not.toContain('Infinity');
  });
});

describe('validateRetirementState warnings', () => {
  it('flags spending beyond all means', () => {
    const s = sanitizeRetirementState(
      asState({
        ...clone(DEFAULT_STATE),
        currentAnnualIncome: 1000,
        essentialExpensesMonthly: 9000,
        discretionaryExpensesMonthly: 2000,
        liquidCash: 0,
        taxableInvestments: 0,
        preTax401k: 0,
        postTaxRothHsa: 0,
        savingsRatePct: 0,
      })
    );
    const issues = validateRetirementState(s);
    expect(issues.some((i) => i.field === 'expenses')).toBe(true);
  });

  it('flags allocations that do not sum to 100%', () => {
    const s = sanitizeRetirementState(asState({ ...clone(DEFAULT_STATE), stockPct: 80, bondPct: 15, cashPct: 20 }));
    // sanitize keeps the off-sum values weighted as entered
    const issues = validateRetirementState(s);
    expect(issues.some((i) => i.field === 'allocation')).toBe(true);
  });

  it('stays quiet on the healthy default plan', () => {
    const issues = validateRetirementState(sanitizeRetirementState(asState(clone(DEFAULT_STATE))));
    expect(issues).toHaveLength(0);
  });
});
