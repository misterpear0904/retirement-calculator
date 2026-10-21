import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { dieWithZeroHorizonAge, dieWithZeroRealRate, calcDieWithZero, DIE_WITH_ZERO_MIN_SUCCESS_RATE } from '../utils/dieWithZero';
import { runRetirementSimulation } from '../utils/calculatorEngine';

describe('dieWithZero utils', () => {
  it('horizon age single', () => {
    expect(dieWithZeroHorizonAge(DEFAULT_STATE)).toBe(DEFAULT_STATE.lifeExpectancy);
  });
  it('horizon age partner', () => {
    const s = { ...DEFAULT_STATE, hasPartner: true, partner: { ...DEFAULT_STATE.partner, enabled: true, lifeExpectancy: 95 } };
    expect(dieWithZeroHorizonAge(s)).toBe(95);
  });
  it('real rate finite', () => {
    expect(Number.isFinite(dieWithZeroRealRate(DEFAULT_STATE))).toBe(true);
  });
  it('calcDieWithZero may return null or object', () => {
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const out = calcDieWithZero(DEFAULT_STATE, result);
    if (out) expect(out.extraAnnualToday).toBeGreaterThanOrEqual(0);
  });
  it('min success rate constant', () => {
    expect(DIE_WITH_ZERO_MIN_SUCCESS_RATE).toBe(80);
  });
});
