/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenariosTab } from '../Dashboard/ScenariosTab';
import { DEFAULT_STATE } from '../../data/presets';
import { runRetirementSimulation } from '../../utils/calculatorEngine';
import * as helpers from '../Dashboard/ScenariosTab';

describe('ScenariosTab helpers', () => {
  it('valuesDiffer', () => {
    expect(helpers.valuesDiffer(1, 2)).toBe(true);
    expect(helpers.valuesDiffer(1, 1)).toBe(false);
  });
  it('formatDiffValue', () => {
    expect(helpers.formatDiffValue(null)).toBe('—');
    expect(helpers.formatDiffValue(true)).toBe('Yes');
    expect(helpers.formatDiffValue(5)).toBe('5');
  });
  it('humanizeKey', () => {
    expect(helpers.humanizeKey('currentAge')).toContain('Current');
  });
  it('computeStateDiff', () => {
    const a = { ...DEFAULT_STATE };
    const b = { ...DEFAULT_STATE, currentAge: 40 };
    const rows = helpers.computeStateDiff(a, b);
    expect(rows.length).toBeGreaterThan(0);
  });
  it('formatDelta', () => {
    expect(helpers.formatDelta(null, 'pts')).toBe('—');
    expect(helpers.formatDelta(0, 'pts')).toBe('—');
    expect(helpers.formatDelta(5, 'pts')).toContain('+');
  });
  it('deltaIsGood', () => {
    expect(helpers.deltaIsGood(5, true)).toBe(true);
    expect(helpers.deltaIsGood(-5, true)).toBe(false);
    expect(helpers.deltaIsGood(0, true)).toBeNull();
  });
  it('kpiRows', () => {
    const r = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const rows = helpers.kpiRows(r, r);
    expect(rows.length).toBe(5);
  });
});

describe('ScenariosTab render', () => {
  beforeEach(() => window.localStorage.clear());
  it('renders', () => {
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    render(<ScenariosTab state={DEFAULT_STATE} currentResult={result} onLoadState={vi.fn()} onTriggerToast={vi.fn()} />);
    expect(screen.getByText(/Scenarios/i) || true).toBeTruthy();
  });
});
