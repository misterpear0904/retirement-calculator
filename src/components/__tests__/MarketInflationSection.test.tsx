/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { useState } from 'react';
import { MarketInflationSection } from '../Accordions/MarketInflationSection';
import { RetirementState } from '../../types/retirement';

// Default mix per app defaults: 80/15/5.
const baseState: RetirementState = {
  stockPct: 80,
  bondPct: 15,
  cashPct: 5,
  inflationMode: 'fixed_3',
  customInflationRate: 3,
  historicalInflationPreset: '1970s_stagflation',
  returnMode: 'deterministic',
  currentAge: 40,
  targetRetirementAge: 65,
} as unknown as RetirementState;

/** Harness that applies onChange updates like the real parent, and records them. */
function TestHarness(props: {
  initial: RetirementState;
  observer: (update: Partial<RetirementState>) => void;
}) {
  const [state, setState] = useState(props.initial);
  return (
    <MarketInflationSection
      state={state}
      isOpen
      onToggle={() => {}}
      onChange={(u) => {
        props.observer(u);
        setState((prev) => ({ ...prev, ...u }));
      }}
    />
  );
}

afterEach(cleanup);

function getBondSlider(): HTMLElement {
  return screen.getByLabelText('Bonds allocation percentage');
}

describe('MarketInflationSection — bonds slider keyboard handling', () => {
  it('ArrowRight raises bondPct by 5, leaves stockPct untouched, cash absorbs the difference', () => {
    const updates: Partial<RetirementState>[] = [];
    render(<TestHarness initial={baseState} observer={(u) => updates.push(u)} />);

    fireEvent.keyDown(getBondSlider(), { key: 'ArrowRight' });

    expect(updates).toHaveLength(1);
    const u = updates[0];
    // Critical regression check: the fix must NOT route through handleStockPctChange.
    expect(u).not.toHaveProperty('stockPct');
    expect(u.bondPct).toBe(20);
    expect(u.cashPct).toBe(0); // 100 - 80 (stock unchanged) - 20
  });

  it('ArrowUp behaves like ArrowRight and total stays 100', () => {
    const updates: Partial<RetirementState>[] = [];
    render(<TestHarness initial={baseState} observer={(u) => updates.push(u)} />);

    fireEvent.keyDown(getBondSlider(), { key: 'ArrowUp' });

    expect(updates[0].bondPct).toBe(20);
    // 80 (stock) + 20 (bond) + 0 (cash) = 100
    expect(baseState.stockPct + (updates[0].bondPct as number) + (updates[0].cashPct as number)).toBe(100);
  });

  it('ArrowDown lowers bondPct by 5 and stocks stay fixed', () => {
    const updates: Partial<RetirementState>[] = [];
    render(<TestHarness initial={baseState} observer={(u) => updates.push(u)} />);

    fireEvent.keyDown(getBondSlider(), { key: 'ArrowDown' });

    expect(updates[0].bondPct).toBe(10);
    expect(updates[0].cashPct).toBe(10); // 100 - 80 - 10
    expect(updates[0]).not.toHaveProperty('stockPct');
  });

  it('repeated ArrowRight clamps at 100 − stockPct instead of stealing stock share', () => {
    const updates: Partial<RetirementState>[] = [];
    render(<TestHarness initial={baseState} observer={(u) => updates.push(u)} />);
    const slider = getBondSlider();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    const last = updates[updates.length - 1];
    expect(last.bondPct).toBe(20); // clamped: 100 - 80 stocks
    expect(last).not.toHaveProperty('stockPct');
  });

  it('bond clicks (onChange) also keep stock fixed and cash = 100 − stock − bond', () => {
    const updates: Partial<RetirementState>[] = [];
    render(<TestHarness initial={baseState} observer={(u) => updates.push(u)} />);

    fireEvent.change(getBondSlider(), { target: { value: '10' } });

    expect(updates[0].bondPct).toBe(10);
    expect(updates[0].cashPct).toBe(10);
    expect(updates[0]).not.toHaveProperty('stockPct');
    expect(baseState.stockPct + 10 + 10).toBe(100);
  });
});
