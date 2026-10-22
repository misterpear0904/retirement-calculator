import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberField } from '../NumberField';

function renderField(onChange = vi.fn(), initial = 100000) {
  render(
    <NumberField
      id="test-money"
      value={initial}
      onChange={onChange}
      ariaLabel="Test money field"
      prefix="$"
    />
  );
  // Use getByLabelText via aria-label.
  return { onChange, input: screen.getByLabelText('Test money field') as HTMLInputElement };
}

describe('NumberField (round-3 task 2 — invalid input feedback)', () => {
  it('accepts a valid typed value and commits it', () => {
    const { onChange, input } = renderField();
    fireEvent.change(input, { target: { value: '150000' } });
    expect(onChange).toHaveBeenCalledWith(150000);
    expect(input.value).toBe('150000');
  });

  it('typing "-100" shows the inline error and never commits', () => {
    const { onChange, input } = renderField();
    for (const text of ['-', '-1', '-10', '-100']) {
      fireEvent.change(input, { target: { value: text } });
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('-100'); // value never silently changes
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number 0 or greater');
    expect(input.className).toMatch(/border-red-500/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('a pasted "-100" is treated exactly like a typed one', () => {
    const { onChange, input } = renderField();
    // A paste arrives as a single change event with the full text — same path
    // as keystroke-by-keystroke entry.
    fireEvent.change(input, { target: { value: '-100' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('-100');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number 0 or greater');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('typing "abc" shows the inline error and keeps the text visible', () => {
    const { onChange, input } = renderField();
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('abc');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number 0 or greater');
  });

  it('blur reverts invalid text to the last valid value', () => {
    const { input } = renderField();
    fireEvent.change(input, { target: { value: '-100' } });
    fireEvent.blur(input);
    expect(input.value).toBe('100000');
  });

  it('empty text clears the error without committing', () => {
    const { onChange, input } = renderField();
    fireEvent.change(input, { target: { value: '-100' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.change(input, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('recovers from the error once a valid value is entered', () => {
    const { input } = renderField();
    fireEvent.change(input, { target: { value: '-1' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.change(input, { target: { value: '5' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});
