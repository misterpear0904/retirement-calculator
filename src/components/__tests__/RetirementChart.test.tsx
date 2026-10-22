/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
import { render } from '@testing-library/react';
import { RetirementChart, computeYDomain, ZOOM_HINT, LONGEVITY_LABELS } from '../Dashboard/RetirementChart';
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

  // Round-3 task 3 acceptance: on the default scenario the accumulation curve
  // must occupy at least half the chart height in focus mode, and toggling
  // back to Full Range must restore the original full view ('auto' domain).
  it('focuses working years on defaults: curve >= half height; full range is auto', () => {
    const r = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const rows = r.yearlyProjections;
    const retirementAge = DEFAULT_STATE.targetRetirementAge;
    const [lo, hi] = computeYDomain(rows, retirementAge, true);
    expect(lo).toBe(0);

    // Where the target-case curve tops out during the working years.
    const workingTop = Math.max(
      ...rows.filter((p) => p.age < retirementAge).map((p) => p.netWorth50)
    );
    // With `hi` as the top of the visible domain, the curve's final value
    // (workingTop) must reach at least half the domain height.
    expect(workingTop / Number(hi)).toBeGreaterThanOrEqual(0.5);

    // Full Range: exactly the previous full view (unbounded auto domain).
    expect(computeYDomain(rows, retirementAge, false)).toEqual(['auto', 'auto']);
  });
});

describe('chart hint + overlay legend (round-3 tasks 4/5)', () => {
  function proj(age: number, b: number) {
    return { age, netWorth95: b * 0.9, netWorth50: b, netWorth10: b * 0.8 } as unknown as YearlyProjection;
  }

  it('zoom hint is single-sourced and accurate', () => {
    expect(ZOOM_HINT).toBe('Ctrl+scroll to zoom · double-click to reset');
    expect(ZOOM_HINT).not.toMatch(/Scroll over the chart/);
  });

  it('renders a legend entry per overlaid scenario and none when overlay is off', () => {
    const rows = [proj(30, 10_000), proj(60, 100_000), proj(90, 50_000)];
    const overlay = [{ name: 'Vacation Home', yearlyProjections: rows }];
    const { container, rerender, queryByText, getByText } = render(
      <RetirementChart yearlyProjections={rows} targetRetirementAge={60} />
    );
    expect(queryByText('Vacation Home')).toBeNull();

    rerender(
      <RetirementChart yearlyProjections={rows} targetRetirementAge={60} overlayScenarios={overlay} />
    );
    expect(getByText('Vacation Home')).toBeTruthy();
    // The legend swatch must use the first shared overlay color
    // (#c084fc, serialized by the DOM as rgb(192, 132, 252)).
    expect(container.innerHTML).toContain('rgb(192, 132, 252)');
  });

  it('longevity tooltip labels replace raw data keys', () => {
    const labels = Object.keys(LONGEVITY_LABELS);
    expect(labels).toEqual(['aliveWithMoney', 'aliveBroke', 'deceased']);
    expect(LONGEVITY_LABELS.aliveWithMoney.label).toBe('Alive with money');
    expect(LONGEVITY_LABELS.aliveBroke.label).toBe('Alive, out of money');
    expect(LONGEVITY_LABELS.deceased.label).toBe('Deceased');
  });
});
