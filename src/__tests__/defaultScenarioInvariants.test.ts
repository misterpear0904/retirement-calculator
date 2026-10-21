import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { runRetirementSimulation } from '../utils/calculatorEngine';

describe('default scenario invariants', () => {
  it('holds baseline invariants', () => {
    const r = runRetirementSimulation(DEFAULT_STATE, { trials: 500 });
    expect(r.successRate).toBe(85);
    expect(r.targetRetirementNetWorth).toBe(6383815);
    const p65 = r.yearlyProjections.find((p) => p.age === 65);
    expect(p65?.totalPortfolio).toBe(8593345);
  });
});
