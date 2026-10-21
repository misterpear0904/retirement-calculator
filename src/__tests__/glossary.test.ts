import { describe, it, expect } from 'vitest';
import { GLOSSARY, glossary } from '../data/glossary';

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
});
