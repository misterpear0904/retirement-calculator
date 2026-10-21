import { describe, it, expect } from 'vitest';
import { describeClamp, sanitizeRetirementState } from '../utils/validation';
import { DEFAULT_STATE } from '../data/presets';

describe('describeClamp (P3 task 23 — visible clamp feedback)', () => {
  it('notices when annual income is capped at $100M', () => {
    const next = sanitizeRetirementState({ ...DEFAULT_STATE, currentAnnualIncome: 200_000_000 });
    expect(next.currentAnnualIncome).toBe(100_000_000);
    expect(describeClamp({ currentAnnualIncome: 200_000_000 }, next)).toBe(
      'Capped Annual income at $100,000,000'
    );
  });

  it('returns null when nothing is clamped', () => {
    const next = sanitizeRetirementState({ ...DEFAULT_STATE, currentAnnualIncome: 120_000 });
    expect(describeClamp({ currentAnnualIncome: 120_000 }, next)).toBeNull();
  });

  it('flags non-finite entries as invalid with revert notice', () => {
    const next = sanitizeRetirementState({ ...DEFAULT_STATE, currentAnnualIncome: NaN });
    const msg = describeClamp({ currentAnnualIncome: NaN }, next);
    expect(msg).toMatch(/Invalid entry for Annual income/);
  });
});
