/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SensitivityTab } from '../Dashboard/SensitivityTab';
import { DEFAULT_STATE } from '../../data/presets';

describe('SensitivityTab', () => {
  it('renders and runs analysis', async () => {
    render(<SensitivityTab state={DEFAULT_STATE} />);
    expect(screen.getByText('Sensitivity Analysis')).toBeTruthy();
    fireEvent.click(screen.getByText(/Run analysis/i));
    await waitFor(() => expect(screen.getByText(/Baseline success/i)).toBeTruthy(), { timeout: 30000 });
  }, 40000);
});
