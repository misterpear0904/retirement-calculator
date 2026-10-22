/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfoTip } from '../InfoTip';

const POLISHED: Array<[string, string]> = [
  ['fireAge', 'FIRE age'],
  ['swr', 'SWR (safe withdrawal rate)'],
  ['rmd', 'an RMD (required minimum distribution)'],
  ['todaysDollars', "today's dollars"],
  ['ssClaim', 'Social Security claiming'],
  ['col', 'COL (cost of living)'],
  ['seqReplay', 'sequence replay'],
  ['histReal', 'historical real returns'],
  ['monteCarlo', 'Monte Carlo'],
];

describe('InfoTip', () => {
  it('renders button with polished aria label', () => {
    render(<InfoTip term="fireAge" />);
    expect(screen.getByLabelText('What is FIRE age?')).toBeTruthy();
  });

  it('asserts polished aria-labels for representative terms', () => {
    for (const [term, label] of POLISHED) {
      const { unmount } = render(<InfoTip term={term} />);
      expect(screen.getByLabelText(`What is ${label}?`)).toBeTruthy();
      unmount();
    }
  });

  it('shows tooltip on click', () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('click toggles open then closed', () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('hover opens, mouse-out closes', async () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.mouseLeave(btn);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('hovering the portaled tooltip keeps it open', async () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    fireEvent.mouseEnter(btn);
    const tooltip = screen.getByRole('tooltip');
    fireEvent.mouseEnter(tooltip);
    fireEvent.mouseLeave(btn);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.mouseLeave(tooltip);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('Escape dismisses', () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('trigger hit area is at least 44px', () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText('What is FIRE age?');
    expect(btn.className).toContain('min-w-[44px]');
    expect(btn.className).toContain('min-h-[44px]');
    expect(btn.className).toContain('p-2');
    expect(btn.className).toContain('-m-2');
  });

  it('custom label', () => {
    render(<InfoTip term="fireAge" label="help" />);
    expect(screen.getByLabelText('help')).toBeTruthy();
  });
});
