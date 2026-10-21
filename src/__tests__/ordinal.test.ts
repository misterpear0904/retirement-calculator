import { describe, it, expect } from 'vitest';
import { ordinal, formatOrdinal } from '../utils/ordinal';

describe('ordinal re-export', () => {
  it('works', () => {
    expect(ordinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
  });
});
