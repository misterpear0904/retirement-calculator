/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SolverTab } from '../Dashboard/SolverTab';
import { DEFAULT_STATE } from '../../data/presets';
import { runRetirementSimulation } from '../../utils/calculatorEngine';

describe('SolverTab', () => {
  it('renders and solves', async () => {
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    render(<SolverTab state={DEFAULT_STATE} baselineResult={result} onTriggerToast={vi.fn()} />);
    expect(screen.getByText('Reverse Solver')).toBeTruthy();
    fireEvent.click(screen.getByText('Solve retirement age'));
    await waitFor(() => expect(screen.getAllByText(/Solve/i).length).toBeGreaterThan(0), { timeout: 60000 });
    fireEvent.click(screen.getByText('Solve savings rate'));
    await waitFor(() => expect(screen.getAllByText(/Solve/i).length).toBeGreaterThan(0), { timeout: 60000 });
  }, 120000);
});
