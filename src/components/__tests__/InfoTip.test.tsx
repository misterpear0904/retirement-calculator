/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTip } from '../InfoTip';

describe('InfoTip', () => {
  it('renders button with aria label', () => {
    render(<InfoTip term="fireAge" />);
    expect(screen.getByLabelText(/What is fire age\?/i)).toBeTruthy();
  });
  it('shows tooltip on click', () => {
    render(<InfoTip term="fireAge" />);
    const btn = screen.getByLabelText(/What is fire age\?/i);
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });
  it('custom label', () => {
    render(<InfoTip term="fireAge" label="help" />);
    expect(screen.getByLabelText('help')).toBeTruthy();
  });
});
