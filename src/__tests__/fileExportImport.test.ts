// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { exportStateToFile, importStateFromFile } from '../utils/fileExportImport';

describe('fileExportImport', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('exportStateToFile does not throw', () => {
    expect(() => exportStateToFile(DEFAULT_STATE)).not.toThrow();
  });

  it('export returns undefined', () => {
    const r = exportStateToFile(DEFAULT_STATE, 'foo.json');
    expect(r).toBeUndefined();
  });

  it('import current format', async () => {
    const file = new File([JSON.stringify({ v: 1, state: { currentAge: 40 } })], 'a.retire', { type: 'application/json' });
    const out = await importStateFromFile(file);
    expect(out).toEqual({ currentAge: 40 });
  });

  it('import raw state', async () => {
    const file = new File([JSON.stringify({ currentAge: 41 })], 'a.json', { type: 'application/json' });
    const out = await importStateFromFile(file);
    expect(out).toEqual({ currentAge: 41 });
  });

  it('import legacy base64', async () => {
    const payload = encodeURIComponent(JSON.stringify({ v: 1, state: { currentAge: 42 } }));
    const b64 = btoa(payload);
    const file = new File([b64], 'a.retire');
    const out = await importStateFromFile(file);
    expect(out).toEqual({ currentAge: 42 });
  });

  it('rejects empty file', async () => {
    const file = new File([''], 'a.retire');
    await expect(importStateFromFile(file)).rejects.toThrow();
  });

  it('rejects invalid json', async () => {
    const file = new File(['{bad'], 'a.retire');
    await expect(importStateFromFile(file)).rejects.toThrow();
  });

  it('rejects non-object', async () => {
    const file = new File([JSON.stringify(42)], 'a.retire');
    await expect(importStateFromFile(file)).rejects.toThrow();
  });
});
