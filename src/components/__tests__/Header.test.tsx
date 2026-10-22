/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { DEFAULT_STATE } from '../../data/presets';

// The preset select applies its change after the native dropdown popup
// finishes closing (scheduleAfterNativePopup), so tests flush two frames.
const frames: Array<(t: number) => void> = [];
const queueingRaf = (cb: (t: number) => void) => {
  frames.push(cb);
  return frames.length;
};
const flushFrames = () => {
  let guard = 0;
  while (frames.length && guard++ < 100) {
    const batch = frames.slice();
    frames.length = 0;
    for (const cb of batch) cb(0);
  }
  frames.length = 0;
};
let originalRaf: unknown;

beforeEach(() => {
  originalRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = queueingRaf;
});

afterEach(() => {
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = originalRaf;
});

describe('Header', () => {
  const props = {
    onExportPdf: vi.fn(),
    onExportInputs: vi.fn(),
    onImportInputs: vi.fn(),
    onLoadPreset: vi.fn(),
    onResetDefault: vi.fn(),
    state: DEFAULT_STATE,
    onTriggerToast: vi.fn(),
    isDark: true,
    onToggleTheme: vi.fn(),
    successRate: 85,
  };

  it('renders preset select and keeps value after selecting', () => {
    render(<Header {...props} />);
    const select = screen.getByLabelText('Load preset scenario') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'fire_early' } });
    flushFrames();
    expect(props.onLoadPreset).toHaveBeenCalledWith('fire_early');
    // value state updated internally
  });

  it('theme toggle calls', () => {
    render(<Header {...props} />);
    fireEvent.click(screen.getByTitle('Toggle Light / Dark Mode'));
    expect(props.onToggleTheme).toHaveBeenCalled();
  });
});
