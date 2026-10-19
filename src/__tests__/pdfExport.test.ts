/** @vitest-environment jsdom */
// Smoke test for the jsPDF integration (guards the v4 named-import change and
// the full vector drawing pipeline against a real jsPDF instance).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { jsPDF } from 'jspdf';
import { exportToPdf } from '../utils/pdfExport';
import { DEFAULT_STATE } from '../data/presets';
import { runRetirementSimulation } from '../utils/calculatorEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pdfExport', () => {
  it('resolves the named jsPDF export and can construct a document', () => {
    expect(typeof jsPDF).toBe('function');
    const doc = new jsPDF('p', 'mm', 'a4');
    expect(typeof doc.output).toBe('function');
    expect(doc.output('datauristring')).toContain('data:application/pdf');
  });

  it('exportToPdf runs the whole drawing pipeline without throwing', async () => {
    // The save step touches browser download plumbing; stub the anchor click so
    // the test focuses on the vector pipeline against a real jsPDF instance.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const result = runRetirementSimulation(DEFAULT_STATE, { trials: 1 });
    await expect(exportToPdf('ignored', DEFAULT_STATE, result)).resolves.toBeUndefined();
  });
});