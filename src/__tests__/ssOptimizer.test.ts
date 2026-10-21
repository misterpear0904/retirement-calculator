import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { primaryClaimRows, spousalMonthly, optimizeHousehold } from '../utils/ssOptimizer';

describe('ssOptimizer', () => {
  it('primaryClaimRows returns array', () => {
    const rows = primaryClaimRows(DEFAULT_STATE);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });
  it('spousalMonthly finite', () => {
    expect(Number.isFinite(spousalMonthly(DEFAULT_STATE.socialSecurityMonthlyAt67, 67))).toBe(true);
  });
  it('optimizeHousehold returns optimum', () => {
    const out = optimizeHousehold(DEFAULT_STATE);
    expect(out).toBeTruthy();
    expect(typeof out.optimum.householdLifetimeTotal).toBe('number');
  });
  it('partner enabled', () => {
    const s = { ...DEFAULT_STATE, hasPartner: true, partner: { ...DEFAULT_STATE.partner, enabled: true } };
    const rows = primaryClaimRows(s);
    expect(Array.isArray(rows)).toBe(true);
    const out = optimizeHousehold(s);
    expect(out).toBeTruthy();
  });
});
