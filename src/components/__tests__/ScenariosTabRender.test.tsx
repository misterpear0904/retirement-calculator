/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenariosTab } from '../Dashboard/ScenariosTab';
import { DEFAULT_STATE } from '../../data/presets';
import { runRetirementSimulation } from '../../utils/calculatorEngine';

describe('ScenariosTab render flow', () => {
  beforeEach(() => window.localStorage.clear());
  it('save scenario', async () => {
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    const onTriggerToast = vi.fn();
    render(<ScenariosTab state={DEFAULT_STATE} currentResult={result} onLoadState={vi.fn()} onTriggerToast={onTriggerToast} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'My Scenario' } });
    const saveBtn = screen.getByText(/Save current as scenario/i);
    fireEvent.click(saveBtn);
    expect(onTriggerToast).toHaveBeenCalled();
  }, 30000);
});
