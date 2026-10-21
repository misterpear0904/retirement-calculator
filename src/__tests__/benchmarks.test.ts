import { describe, it, expect } from 'vitest';
import { normalCdf, lognormalPercentile, savingsPercentile, getBandForAge, ageAdjustedWealthMedian, multipleOfMedian, AGE_BANDS, REGION_BENCHMARKS, US_OVERALL_MEDIAN_WEALTH_USD } from '../data/benchmarks';

describe('benchmarks', () => {
  it('constants', () => {
    expect(US_OVERALL_MEDIAN_WEALTH_USD).toBeGreaterThan(0);
    expect(AGE_BANDS.length).toBeGreaterThan(0);
    expect(REGION_BENCHMARKS.length).toBeGreaterThan(0);
  });
  it('normalCdf', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
  });
  it('lognormalPercentile', () => {
    expect(typeof lognormalPercentile(100, 50, 1)).toBe('number');
  });
  it('savingsPercentile', () => {
    expect(typeof savingsPercentile(10, 5)).toBe('number');
  });
  it('getBandForAge', () => {
    const b = getBandForAge(40);
    expect(b).toBeTruthy();
  });
  it('ageAdjustedWealthMedian', () => {
    const v = ageAdjustedWealthMedian(REGION_BENCHMARKS[0], 40);
    expect(Number.isFinite(v)).toBe(true);
  });
  it('multipleOfMedian', () => {
    expect(multipleOfMedian(200, 100)).toBe(2);
  });
});
