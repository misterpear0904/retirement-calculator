import { describe, it, expect } from 'vitest';
import { formatCurrency, formatMoney, fmtCurrency, formatCompactCurrency } from '../utils/formatCurrency';

describe('formatCurrency', () => {
  it('billions', () => expect(formatCurrency(1_200_000_000)).toBe('$1.2B'));
  it('millions', () => expect(formatCurrency(1_500_000)).toBe('$1.5M'));
  it('thousands', () => expect(formatCurrency(42_000)).toBe('$42.0K'));
  it('small', () => expect(formatCurrency(42)).toBe('$42'));
  it('negative', () => expect(formatCurrency(-1_500_000)).toBe('-$1.5M'));
  it('NaN -> 0', () => expect(formatCurrency(NaN)).toBe('$0'));
  it('Infinity -> 0', () => expect(formatCurrency(Infinity)).toBe('$0'));
  it('aliases', () => {
    expect(formatMoney(1000)).toBe(formatCurrency(1000));
    expect(fmtCurrency(1000)).toBe(formatCurrency(1000));
    expect(formatCompactCurrency(1000)).toBe(formatCurrency(1000));
  });
  it('boundary 1000', () => expect(formatCurrency(1000)).toBe('$1.0K'));
  it('boundary 1e6', () => expect(formatCurrency(1_000_000)).toBe('$1.0M'));
});
