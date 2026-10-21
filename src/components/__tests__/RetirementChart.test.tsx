/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
import { render } from '@testing-library/react';
import { RetirementChart } from '../Dashboard/RetirementChart';
import { DEFAULT_STATE } from '../../data/presets';
import { runRetirementSimulation } from '../../utils/calculatorEngine';

describe('RetirementChart', () => {
  it('renders', () => {
    const r = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const { container } = render(<RetirementChart yearlyProjections={r.yearlyProjections} targetRetirementAge={DEFAULT_STATE.targetRetirementAge} />);
    expect(container).toBeTruthy();
  });
});
