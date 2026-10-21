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
