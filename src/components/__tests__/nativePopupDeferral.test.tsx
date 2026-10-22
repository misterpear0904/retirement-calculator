/** @vitest-environment jsdom */
// Task 1 (round 3): native-select/dropdown interaction path.
// Regression guards for the popup-teardown deferral applied to the Section H
// strategy selects and the Header preset select.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxStrategySection } from '../Accordions/TaxStrategySection';
import { Header } from '../Header';
import { DEFAULT_STATE } from '../../data/presets';
import { scheduleAfterNativePopup } from '../../utils/scheduleAfterNativePopup';

// jsdom owns window.requestAnimationFrame with a non-configurable property, so
// patch by plain assignment (writable) and restore the original afterwards.
const frames: Array<(t: number) => void> = [];
const queueingRaf = (cb: (t: number) => void) => {
  frames.push(cb);
  return frames.length;
};
let originalRaf: unknown;

beforeEach(() => {
  originalRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = queueingRaf;
});

afterEach(() => {
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = originalRaf;
});

const flushFrames = () => {
  let guard = 0;
  while (frames.length && guard++ < 100) {
    const batch = frames.slice();
    frames.length = 0;
    for (const cb of batch) cb(0);
  }
  frames.length = 0;
};

describe('scheduleAfterNativePopup', () => {
  it('defers the callback by two animation frames', () => {
    const fn = vi.fn();
    const tick = () => {
      const batch = frames.slice();
      frames.length = 0;
      for (const cb of batch) cb(0);
    };
    scheduleAfterNativePopup(fn);
    tick(); // outer rAF callback runs, queues the inner one
    expect(fn).not.toHaveBeenCalled();
    tick(); // inner frame commits the callback
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('falls back to timeout scheduling when rAF is unavailable', () => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = undefined;
    vi.useFakeTimers();
    const fn = vi.fn();
    scheduleAfterNativePopup(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('Task 1: select change is deferred off the popup-teardown window', () => {
  it('spending strategy onChange fires only after the popup teardown frames', () => {
    const onChange = vi.fn();
    render(
      <TaxStrategySection state={DEFAULT_STATE} onChange={onChange} isOpen={true} onToggle={vi.fn()} />
    );
    const select = screen
      .getAllByRole('combobox')
      .find((el) =>
        Array.from((el as HTMLSelectElement).options).some((o) => o.value === 'vpw')
      ) as HTMLSelectElement;
    expect(select).toBeTruthy();

    fireEvent.change(select, { target: { value: 'vpw' } });
    // Not applied synchronously on the change event (popup still tearing down).
    expect(onChange).not.toHaveBeenCalled();

    flushFrames();
    expect(onChange).toHaveBeenCalledWith({ spendingStrategy: 'vpw' });
  });

  it('withdrawal strategy onChange fires only after the popup teardown frames', () => {
    const onChange = vi.fn();
    render(
      <TaxStrategySection state={DEFAULT_STATE} onChange={onChange} isOpen={true} onToggle={vi.fn()} />
    );
    const select = screen
      .getAllByRole('combobox')
      .find((el) =>
        Array.from((el as HTMLSelectElement).options).some((o) => o.value === 'guardrails')
      ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'guardrails' } });
    expect(onChange).not.toHaveBeenCalled();
    flushFrames();
    expect(onChange).toHaveBeenCalledWith({ withdrawalStrategy: 'guardrails' });
  });

  it('preset dropdown onChange applies after the popup teardown frames', () => {
    const onLoadPreset = vi.fn();
    render(
      <Header
        onExportPdf={vi.fn()}
        onExportInputs={vi.fn()}
        onImportInputs={vi.fn()}
        onLoadPreset={onLoadPreset}
        onResetDefault={vi.fn()}
        state={DEFAULT_STATE}
        onTriggerToast={vi.fn()}
        isDark={true}
        onToggleTheme={vi.fn()}
        successRate={85}
      />
    );
    const select = document.getElementById('preset-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'tech_worker_sf' } });
    expect(onLoadPreset).not.toHaveBeenCalled();
    flushFrames();
    expect(onLoadPreset).toHaveBeenCalledWith('tech_worker_sf');
  });
});
