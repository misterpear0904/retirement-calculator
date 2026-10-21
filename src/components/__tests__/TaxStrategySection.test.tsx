/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxStrategySection } from '../Accordions/TaxStrategySection';
import { DEFAULT_STATE } from '../../data/presets';

describe('TaxStrategySection', () => {
  it('renders bracket-fill viz when roth on', () => {
    const state = { ...DEFAULT_STATE, useRothConversions: true };
    render(<TaxStrategySection state={state} onChange={vi.fn()} isOpen={true} onToggle={vi.fn()} />);
    expect(screen.getByText(/Federal bracket fill/i)).toBeTruthy();
  });
  it('toggle roth calls onChange', () => {
    const onChange = vi.fn();
    render(<TaxStrategySection state={DEFAULT_STATE} onChange={onChange} isOpen={true} onToggle={vi.fn()} />);
    const sw = screen.getByRole('switch');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalled();
  });
});
