import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { runRetirementSimulation } from '../utils/calculatorEngine';

describe('roth conversion engine path', () => {
  it('runs with roth conversions on', () => {
    const s = { ...DEFAULT_STATE, useRothConversions: true };
    const r = runRetirementSimulation(s, { trials: 1 });
    expect(r).toBeTruthy();
  });
});
