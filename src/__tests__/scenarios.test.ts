// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { listScenarios, saveScenario, deleteScenario } from '../utils/scenarios';

describe('scenarios CRUD', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('list empty initially', () => {
    expect(listScenarios()).toEqual([]);
  });

  it('save and list', () => {
    const entry = saveScenario('  My Plan  ', DEFAULT_STATE);
    expect(entry.name).toBe('My Plan');
    const list = listScenarios();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(entry.id);
  });

  it('trims name and defaults empty', () => {
    const e = saveScenario('   ', DEFAULT_STATE);
    expect(e.name).toBe('Untitled scenario');
    const e2 = saveScenario('x'.repeat(100), DEFAULT_STATE);
    expect(e2.name.length).toBe(60);
  });

  it('delete removes', () => {
    const e = saveScenario('a', DEFAULT_STATE);
    const remaining = deleteScenario(e.id);
    expect(remaining).toHaveLength(0);
    expect(listScenarios()).toHaveLength(0);
  });

  it('caps at 20', () => {
    for (let i = 0; i < 25; i++) saveScenario(`s${i}`, DEFAULT_STATE);
    expect(listScenarios().length).toBe(20);
  });

  it('sorts newest first', () => {
    saveScenario('first', DEFAULT_STATE);
    saveScenario('second', DEFAULT_STATE);
    const list = listScenarios();
    expect(list[0].name).toBe('second');
  });

  it('readAll filters invalid', () => {
    window.localStorage.setItem('apexretire-scenarios-v1', JSON.stringify([{ id: 1 }, null, { id: 'x', state: {} }]));
    const list = listScenarios();
    expect(list.map((s) => s.id)).toContain('x');
  });
  it('readAll returns [] on invalid JSON', () => {
    window.localStorage.setItem('apexretire-scenarios-v1', '{bad');
    expect(listScenarios()).toEqual([]);
  });

  it('storage full non-fatal', () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => saveScenario('a', DEFAULT_STATE)).not.toThrow();
    setItem.mockRestore();
  });
});
