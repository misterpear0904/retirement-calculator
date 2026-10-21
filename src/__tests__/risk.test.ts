import { describe, it, expect } from 'vitest';
import { getRiskLabel, getRiskBadgeClasses, getRiskCardClasses } from '../utils/risk';

describe('risk', () => {
  it('labels', () => {
    expect(getRiskLabel(90)).toBe('Very Safe');
    expect(getRiskLabel(75)).toBe('On Track');
    expect(getRiskLabel(55)).toBe('Moderate Risk');
    expect(getRiskLabel(40)).toBe('High Risk');
  });
  it('badge classes non-empty', () => {
    for (const r of [90, 75, 55, 40]) {
      expect(getRiskBadgeClasses(r).length).toBeGreaterThan(0);
      expect(getRiskCardClasses(r).length).toBeGreaterThan(0);
    }
  });
});
