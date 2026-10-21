import { describe, it, expect } from 'vitest';
import { bracketFill } from '../utils/taxEngine';

describe('bracketFill', () => {
  it('single zero income all zero filled', () => {
    const rows = bracketFill(0, 'single');
    expect(rows.every((r) => r.filled === 0)).toBe(true);
  });
  it('single fills first bracket partially', () => {
    const rows = bracketFill(10000, 'single');
    expect(rows[0].filled).toBe(10000);
    expect(rows[1].filled).toBe(0);
  });
  it('single boundary 12400', () => {
    const rows = bracketFill(12400, 'single');
    expect(rows[0].filled).toBe(12400);
  });
  it('joint higher brackets', () => {
    const rows = bracketFill(100000, 'joint');
    expect(rows[0].cap).toBe(24800);
    expect(rows.reduce((a, r) => a + r.filled, 0)).toBe(100000);
  });
  it('income beyond top fills last bracket', () => {
    const rows = bracketFill(1_000_000, 'single');
    const last = rows[rows.length - 1];
    expect(last.filled).toBeGreaterThan(0);
    expect(rows.reduce((a, r) => a + r.filled, 0)).toBe(1_000_000);
  });
  it('negative income clamped to 0', () => {
    const rows = bracketFill(-50, 'single');
    expect(rows.every((r) => r.filled === 0)).toBe(true);
  });
  it('floors/caps consistent', () => {
    const rows = bracketFill(50000, 'single');
    expect(rows[0].floor).toBe(0);
    expect(rows[1].floor).toBe(12400);
  });
});
