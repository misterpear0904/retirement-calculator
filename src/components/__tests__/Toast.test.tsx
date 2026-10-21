/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('renders null when no message', () => {
    const { container } = render(<Toast message={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
  it('renders message and dismiss', () => {
    render(<Toast message="hi" onClose={() => {}} />);
    expect(screen.getByText('hi')).toBeTruthy();
    expect(screen.getByLabelText('Dismiss notification')).toBeTruthy();
  });
});
