import { describe, it, expect } from 'vitest';
import { GLOSSARY, glossary, GLOSSARY_LABELS, INFO_LABELS, glossaryLabel } from '../data/glossary';

describe('glossary', () => {
  it('returns definition for known term', () => {
    expect(glossary('fireAge')).toContain('25x');
  });
  it('returns term for unknown', () => {
    expect(glossary('zzzz')).toBe('zzzz');
  });
  it('all values non-empty strings', () => {
    for (const k of Object.keys(GLOSSARY)) {
      expect(typeof GLOSSARY[k]).toBe('string');
      expect(GLOSSARY[k].length).toBeGreaterThan(0);
    }
  });
  it('has expected count', () => {
    expect(Object.keys(GLOSSARY).length).toBeGreaterThan(20);
  });

  it('every glossary term has a polished label override', () => {
    for (const k of Object.keys(GLOSSARY)) {
      expect(typeof GLOSSARY_LABELS[k]).toBe('string');
      expect((GLOSSARY_LABELS[k] as string).length).toBeGreaterThan(0);
      expect(glossaryLabel(k)).toBe(GLOSSARY_LABELS[k]);
    }
  });

  it('INFO_LABELS is an alias of GLOSSARY_LABELS', () => {
    expect(INFO_LABELS).toBe(GLOSSARY_LABELS);
  });

  it('every InfoTip term has a polished label override', () => {
    const terms = [
      'brackets', 'guardrails', 'rmd', 'rothConversion', 'successRate', 'fireAge',
      'todaysDollars', 'swr', 'dieWithZero', 'seqReplay', 'monteCarlo', 'histReal',
      'sequenceRisk', 'sensitivity', 'col', 'ssClaim', 'bands', 'scenarios',
      'survivorBenefit', 'savingsRate', 'healthcare',
    ];
    for (const t of terms) {
      expect(typeof GLOSSARY_LABELS[t]).toBe('string');
      expect(glossaryLabel(t)).toBe(GLOSSARY_LABELS[t]);
    }
  });

  it('accessor handles unknown terms via humanizeTerm fallback', () => {
    expect(glossaryLabel('fooBar')).toBe('foo bar');
    expect(glossaryLabel('unknown_term')).toBe('unknown term');
    expect(glossaryLabel('zzzz')).toBe('zzzz');
  });

  it('required polished examples', () => {
    expect(glossaryLabel('swr')).toBe('SWR (safe withdrawal rate)');
    expect(glossaryLabel('seqReplay')).toBe('sequence replay');
    expect(glossaryLabel('histReal')).toBe('historical real returns');
    expect(glossaryLabel('ssClaim')).toBe('Social Security claiming');
    expect(glossaryLabel('col')).toBe('COL (cost of living)');
    expect(glossaryLabel('rmd')).toBe('an RMD (required minimum distribution)');
    expect(glossaryLabel('todaysDollars')).toBe("today's dollars");
  });
});
