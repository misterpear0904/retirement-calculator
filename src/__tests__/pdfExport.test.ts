/** @vitest-environment jsdom */
// Smoke test for the jsPDF integration (guards the v4 named-import change and
// the full vector drawing pipeline against a real jsPDF instance).
//
// jspdf's `save()` writes a real file when running under node/vitest, so it is
// neutralized here — the goal is to exercise the drawing pipeline, not to
// download a PDF on every test run.
import { describe, it, expect, vi } from 'vitest';

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  const Real = actual.jsPDF as unknown as new (...args: unknown[]) => Record<string, unknown>;
  const Wrapped = function (this: unknown, ...args: unknown[]) {
    const doc = new Real(...args);
    doc.save = () => doc; // no-op: never touch the filesystem from tests
    return doc;
  } as unknown as typeof actual.jsPDF;
  return { ...actual, jsPDF: Wrapped };
});

const { jsPDF } = await import('jspdf');
const { exportToPdf } = await import('../utils/pdfExport');
const { DEFAULT_STATE } = await import('../data/presets');
const { runRetirementSimulation } = await import('../utils/calculatorEngine');

describe('pdfExport', () => {
  it('resolves the named jsPDF export and can construct a document', () => {
    expect(typeof jsPDF).toBe('function');
    const doc = new jsPDF('p', 'mm', 'a4');
    expect(typeof doc.output).toBe('function');
    const dataUri = doc.output('datauristring') as unknown as string;
    expect(dataUri).toContain('data:application/pdf');
  });

  it('exportToPdf runs the whole drawing pipeline without throwing', async () => {
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    await expect(exportToPdf('ignored', DEFAULT_STATE, result)).resolves.toBeUndefined();
  });
});
