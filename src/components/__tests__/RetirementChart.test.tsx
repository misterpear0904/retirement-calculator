/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
import { render } from '@testing-library/react';
import { RetirementChart, computeYDomain } from '../Dashboard/RetirementChart';
import { DEFAULT_STATE } from '../../data/presets';
import type { YearlyProjection } from '../../types/retirement';
import { runRetirementSimulation } from '../../utils/calculatorEngine';

describe('RetirementChart', () => {
  it('renders', () => {
    const r = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const { container } = render(<RetirementChart yearlyProjections={r.yearlyProjections} targetRetirementAge={DEFAULT_STATE.targetRetirementAge} />);
    expect(container).toBeTruthy();
  });
});

describe('computeYDomain', () => {
  // build minimal projection objects
  function proj(age: number, a: number, b: number, c: number) {
    return { age, netWorth95: a, netWorth50: b, netWorth10: c } as unknown as YearlyProjection;
  }

  it('returns auto when not focused', () => {
    const rows = [proj(30, 100, 200, 50), proj(70, 1000, 2000, 500)];
    expect(computeYDomain(rows, 65, false)).toEqual(['auto', 'auto']);
  });

  it('focuses on working years max across bands', () => {
    const rows = [proj(30, 1000, 2000, 500), proj(40, 4000, 6000, 3000), proj(70, 10000, 20000, 5000)];
    const [lo, hi] = computeYDomain(rows, 65, true);
    expect(lo).toBe(0);
    // max working-year value 6000 * 1.1 = 6600
    expect(hi).toBe(6600);
  });

  it('falls back to all rows when no working-year rows', () => {
    const rows = [proj(70, 1000, 2000, 500)];
    const [lo, hi] = computeYDomain(rows, 65, true);
    expect(lo).toBe(0);
    expect(hi).toBe(Math.round(2000 * 1.1));
  });

  it('guards non-finite values with floor 1000', () => {
    const rows = [proj(30, NaN as unknown as number, Infinity as unknown as number, 0)];
    const [lo, hi] = computeYDomain(rows, 65, true);
    expect(lo).toBe(0);
    // floor 1000 * 1.1
    expect(hi).toBe(1100);
  });
});
