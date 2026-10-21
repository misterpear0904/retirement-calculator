import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE, applyPreset, PRESET_LABELS } from '../data/presets';

describe('presets', () => {
  it('default state has expected invariants', () => {
    expect(DEFAULT_STATE.currentAge).toBe(32);
    expect(DEFAULT_STATE.targetRetirementAge).toBe(60);
  });
  it('applyPreset tech_worker_sf overrides', () => {
    const s = applyPreset(DEFAULT_STATE, 'tech_worker_sf');
    expect(s.currentAge).toBe(29);
    expect(s.targetLocationId).toBe('PT_LISBON');
  });
  it('applyPreset family_texas', () => {
    const s = applyPreset(DEFAULT_STATE, 'family_texas');
    expect(s.targetLocationId).toBe('TX_AUSTIN');
  });
  it('applyPreset fire_early', () => {
    const s = applyPreset(DEFAULT_STATE, 'fire_early');
    expect(s.lifestyleTier).toBe('minimalist');
  });
  it('unknown preset returns base', () => {
    const s = applyPreset(DEFAULT_STATE, 'nope');
    expect(s).toBe(DEFAULT_STATE);
  });
  it('labels complete', () => {
    expect(Object.keys(PRESET_LABELS)).toHaveLength(3);
  });
  it('presets do not mutate base', () => {
    const before = DEFAULT_STATE.currentAge;
    applyPreset(DEFAULT_STATE, 'fire_early');
    expect(DEFAULT_STATE.currentAge).toBe(before);
  });
});
