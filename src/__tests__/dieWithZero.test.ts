// @vitest-environment node
// Die-with-Zero surplus readout: median leftover -> spendable $/yr.
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState, SimulationResult } from '../types/retirement';
import {
  calcDieWithZero,
  dieWithZeroHorizonAge,
  dieWithZeroRealRate,
  DIE_WITH_ZERO_MIN_SUCCESS_RATE,
} from '../utils/dieWithZero';

function mkState(over: Partial<RetirementState> = {}): RetirementState {
  return { ...DEFAULT_STATE, ...over };
}

/** Minimal result stub — calc only reads finalNetWorth + last inflationFactor. */
function mkResult(finalNetWorth: number, endInflation: number): SimulationResult {
  return {
    finalNetWorth,
    yearlyProjections: [{ inflationFactor: endInflation }],
  } as unknown as SimulationResult;
}

describe('calcDieWithZero', () => {
  it('converts a surplus into yearly spending with a zero real rate (exact hand-check)', () => {
    // 100% cash at 2.5% nominal vs 2.5% inflation => rr = 0 exactly.
    // Real surplus 200k over 20 retired years => exactly 10k/yr.
    const state = mkState({
      stockPct: 0,
      bondPct: 0,
      cashPct: 100,
      inflationMode: 'custom',
      customInflationRate: 2.5,
      targetRetirementAge: 65,
      lifeExpectancy: 85,
    });
    expect(dieWithZeroRealRate(state)).toBeCloseTo(0, 12);
    const out = calcDieWithZero(state, mkResult(400_000, 2.0));
    expect(out).not.toBeNull();
    expect(out!.extraAnnualToday).toBe(10_000);
    expect(out!.retiredYears).toBe(20);
    expect(out!.horizonAge).toBe(85);
    expect(out!.surplus).toBe(400_000);
  });

  it('floors conservatively to the $100 and accounts for real growth', () => {
    const state = mkState({
      stockPct: 100,
      bondPct: 0,
      cashPct: 0,
      customStockReturn: 7,
      inflationMode: 'custom',
      customInflationRate: 3,
      targetRetirementAge: 65,
      lifeExpectancy: 90,
    });
    const rr = dieWithZeroRealRate(state);
    expect(rr).toBeGreaterThan(0.03);
    const out = calcDieWithZero(state, mkResult(1_000_000, 2.0));
    expect(out).not.toBeNull();
    // Positive real growth pushes the annuity factor above N=25: each dollar
    // spent early forgoes decades of compounding, so the answer must come in
    // BELOW naive division (500k real / 25 = 20k) yet stay sane.
    expect(out!.extraAnnualToday).toBeGreaterThan(10_000);
    expect(out!.extraAnnualToday).toBeLessThan(20_000);
    expect(out!.extraAnnualToday % 100).toBe(0);
  });

  it('returns null when there is no meaningful surplus', () => {
    const state = mkState({ targetRetirementAge: 65, lifeExpectancy: 90 });
    expect(calcDieWithZero(state, mkResult(0, 2.0))).toBeNull();
    expect(calcDieWithZero(state, mkResult(-50_000, 2.0))).toBeNull();
    expect(calcDieWithZero(state, mkResult(999, 2.0))).toBeNull();
  });

  it('returns null for short horizons and missing inflation data', () => {
    const short = mkState({ targetRetirementAge: 88, lifeExpectancy: 90 });
    expect(calcDieWithZero(short, mkResult(500_000, 1.5))).toBeNull();
    const state = mkState({ targetRetirementAge: 65, lifeExpectancy: 90 });
    expect(
      calcDieWithZero(state, { finalNetWorth: 500_000, yearlyProjections: [] } as unknown as SimulationResult)
    ).toBeNull();
  });

  it('extends the horizon to the longer-lived partner', () => {
    const state = mkState({
      targetRetirementAge: 65,
      lifeExpectancy: 85,
      hasPartner: true,
      partner: { ...DEFAULT_STATE.partner, enabled: true, lifeExpectancy: 95 },
    });
    expect(dieWithZeroHorizonAge(state)).toBe(95);
    const out = calcDieWithZero(state, mkResult(1_000_000, 1.0));
    expect(out?.retiredYears).toBe(30);
  });

  it('confidence gate constant matches the documented safe threshold', () => {
    expect(DIE_WITH_ZERO_MIN_SUCCESS_RATE).toBe(80);
  });
});
