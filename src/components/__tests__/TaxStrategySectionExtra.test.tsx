/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaxStrategySection } from '../Accordions/TaxStrategySection';
import { DEFAULT_STATE } from '../../data/presets';

describe('TaxStrategySection extra', () => {
  it('runs explorer', async () => {
    const state = { ...DEFAULT_STATE, useRothConversions: true };
    render(<TaxStrategySection state={state} onChange={vi.fn()} isOpen={true} onToggle={vi.fn()} />);
    fireEvent.click(screen.getByText(/Compare with vs without conversions/i));
    await waitFor(() => expect(screen.getByText(/Success/i)).toBeTruthy(), { timeout: 60000 });
  }, 90000);
});
