import { describe, it, expect } from 'vitest';
import { formatOrdinal } from '../utils/formatOrdinal';

describe('formatOrdinal', () => {
  it('handles 11/12/13 as th', () => {
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
  });
  it('st/nd/rd for 1/2/3', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(3)).toBe('3rd');
  });
  it('th for 4-10', () => {
    for (let i = 4; i <= 10; i++) expect(formatOrdinal(i)).toBe(`${i}th`);
  });
  it('21st,22nd,23rd', () => {
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(22)).toBe('22nd');
    expect(formatOrdinal(23)).toBe('23rd');
  });
  it('non-integer rounds', () => {
    expect(formatOrdinal(4.6)).toBe('5th');
  });
  it('NaN/Infinity -> 0', () => {
    expect(formatOrdinal(NaN)).toBe('0th');
    expect(formatOrdinal(Infinity)).toBe('0th');
  });
  it('negative numbers', () => {
    expect(formatOrdinal(-1)).toBe('-1st');
    expect(formatOrdinal(-11)).toBe('-11th');
  });
  it('100/101/102/103', () => {
    expect(formatOrdinal(100)).toBe('100th');
    expect(formatOrdinal(101)).toBe('101st');
    expect(formatOrdinal(102)).toBe('102nd');
    expect(formatOrdinal(103)).toBe('103rd');
    expect(formatOrdinal(111)).toBe('111th');
    expect(formatOrdinal(112)).toBe('112th');
    expect(formatOrdinal(113)).toBe('113th');
  });
});
