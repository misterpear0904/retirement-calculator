import { describe, it, expect } from 'vitest';
import { sanitizeRetirementState, validateRetirementState } from '../utils/validation';
import { DEFAULT_STATE } from '../data/presets';
import { RetirementState } from '../types/retirement';

const asState = (o: unknown): RetirementState => o as RetirementState;
const clone = (o: unknown) => JSON.parse(JSON.stringify(o));

describe('validation extra', () => {
  it('flags targetRetirementAge', () => {
    const s = sanitizeRetirementState(asState({ ...clone(DEFAULT_STATE), currentAge: 40, targetRetirementAge: 35 }));
    // sanitize may clamp; force via direct? validate checks. Instead construct state with target <= current by bypassing sanitize? validate on sanitized result may not trigger. Use raw-ish:
    const raw = asState({ ...clone(DEFAULT_STATE), currentAge: 40, targetRetirementAge: 39 });
    // sanitize clamps target to current+1, so instead call validate on unsanitized? validate expects RetirementState. Call with raw.
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
