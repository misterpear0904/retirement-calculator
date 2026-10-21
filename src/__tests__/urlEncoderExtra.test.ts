// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearScenarioFromUrl } from '../utils/urlEncoder';

type WinShim = { location: { href: string; hash: string }; history: { replaceState: (...a: unknown[]) => void } };
const originalWindow = globalThis.window;

function shimWindow(href: string) {
  (globalThis as unknown as { window: unknown }).window = {
    location: {
      href,
      get hash() {
        const i = href.indexOf('#');
        return i === -1 ? '' : href.slice(i);
      },
    },
    history: { replaceState: () => {} },
  };
}

beforeEach(() => shimWindow('https://example.com/#scenario=abc'));
afterEach(() => { (globalThis as unknown as { window: unknown }).window = originalWindow; });

describe('urlEncoder extra', () => {
  it('clearScenarioFromUrl with hash', () => {
    expect(() => clearScenarioFromUrl()).not.toThrow();
  });
});
