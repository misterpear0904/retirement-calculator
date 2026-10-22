// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { saveStateToStorage, loadStateFromStorage, clearStoredState } from '../utils/storage';

describe('storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('round trip', () => {
    saveStateToStorage(DEFAULT_STATE);
    const loaded = loadStateFromStorage();
    expect(loaded).not.toBeNull();
    expect((loaded as { currentAge: number }).currentAge).toBe(DEFAULT_STATE.currentAge);
  });

  it('returns null when empty', () => {
    expect(loadStateFromStorage()).toBeNull();
  });

  it('clear removes', () => {
    saveStateToStorage(DEFAULT_STATE);
    clearStoredState();
    expect(loadStateFromStorage()).toBeNull();
  });

  it('handles raw partial state (legacy)', () => {
    window.localStorage.setItem('apexretire-saved-state-v1', JSON.stringify({ currentAge: 40 }));
    const loaded = loadStateFromStorage();
    expect(loaded).toEqual({ currentAge: 40 });
  });

  // Task 12 (round 3): in a single clean profile the restore must be
  // deterministic — save once, then "reload" as many times as you like, and
  // every load returns exactly the same snapshot (no double-apply, no
  // alternate keys picked up between boots).
  it('clean profile: repeated reloads restore the identical snapshot', () => {
    saveStateToStorage({ ...DEFAULT_STATE, currentAnnualIncome: 123456 });
    for (let i = 0; i < 5; i++) {
      const loaded = loadStateFromStorage();
      expect(loaded).not.toBeNull();
      expect((loaded as { currentAnnualIncome: number }).currentAnnualIncome).toBe(123456);
      expect((loaded as { targetRetirementAge: number }).targetRetirementAge).toBe(
        DEFAULT_STATE.targetRetirementAge,
      );
    }
  });

  it('clean profile: saving over a snapshot is last-writer-wins, then stable across reloads', () => {
    saveStateToStorage({ ...DEFAULT_STATE, currentAnnualIncome: 100000 });
    saveStateToStorage({ ...DEFAULT_STATE, currentAnnualIncome: 200000 });
    const first = loadStateFromStorage();
    expect((first as { currentAnnualIncome: number }).currentAnnualIncome).toBe(200000);
    expect(loadStateFromStorage()).toEqual(first);
  });

  // Task 12: the guarded key only applies v1 payloads — a snapshot written by
  // an unknown schema version is ignored instead of silently merged.
  it('rejects a payload stamped with an unknown version', () => {
    window.localStorage.setItem(
      'apexretire-saved-state-v1',
      JSON.stringify({ v: 2, savedAt: '2026-01-01', state: { currentAge: 99 } }),
    );
    expect(loadStateFromStorage()).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    window.localStorage.setItem('apexretire-saved-state-v1', '{bad');
    expect(loadStateFromStorage()).toBeNull();
  });

  it('storage full non-fatal', () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => saveStateToStorage(DEFAULT_STATE)).not.toThrow();
    setItem.mockRestore();
  });

  it('removeItem throws non-fatal', () => {
    const remove = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => { throw new Error('x'); });
    expect(() => clearStoredState()).not.toThrow();
    remove.mockRestore();
  });
});
