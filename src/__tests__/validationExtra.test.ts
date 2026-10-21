import { describe, it, expect } from 'vitest';
import { validateRetirementState } from '../utils/validation';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState } from '../types/retirement';

const asState = (o: unknown): RetirementState => o as RetirementState;
const clone = (o: unknown) => JSON.parse(JSON.stringify(o));

describe('validation extra', () => {
  it('flags targetRetirementAge', () => {
    // sanitize may clamp; construct state with target <= current bypassing sanitize
    const raw = asState({ ...clone(DEFAULT_STATE), currentAge: 40, targetRetirementAge: 39 });
    const issues = validateRetirementState(raw);
    expect(issues.some((i) => i.field === 'targetRetirementAge')).toBe(true);
  });
  it('flags lifeExpectancy', () => {
    const raw = asState({ ...clone(DEFAULT_STATE), lifeExpectancy: 40, targetRetirementAge: 50 });
    const issues = validateRetirementState(raw);
    expect(issues.some((i) => i.field === 'lifeExpectancy')).toBe(true);
  });
  it('handles non-array customCategories in monthlySpend', () => {
    const raw = asState({ ...clone(DEFAULT_STATE), customCategories: 'nope' as unknown as RetirementState['customCategories'] });
    expect(() => validateRetirementState(raw)).not.toThrow();
  });
});
