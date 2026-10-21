// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { sanitizeRetirementState } from '../utils/validation';
import { encodeStateToUrl, decodeStateFromUrl } from '../utils/urlEncoder';

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

beforeEach(() => {
  shimWindow('https://example.com/retirement-calculator/');
});

afterEach(() => {
  (globalThis as unknown as { window: unknown }).window = originalWindow;
});

describe('share URL roundtrip (clean state)', () => {
  it('builds a share URL, decodes it in a clean window, and restores inputs', async () => {
    const modified = sanitizeRetirementState({ ...DEFAULT_STATE, currentAge: 40, savingsRatePct: 30, targetRetirementAge: 55 });
    const url = await encodeStateToUrl(modified);
    // clean state: reset window to base URL with no hash
    shimWindow('https://example.com/retirement-calculator/');
    shimWindow(url);
    const decoded = await decodeStateFromUrl();
    expect(decoded).not.toBeNull();
    const restored = sanitizeRetirementState({ ...DEFAULT_STATE, ...decoded });
    expect(restored.currentAge).toBe(modified.currentAge);
    expect(restored.savingsRatePct).toBe(modified.savingsRatePct);
    expect(restored.targetRetirementAge).toBe(modified.targetRetirementAge);
  });
});
