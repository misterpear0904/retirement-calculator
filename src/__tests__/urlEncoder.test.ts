// @vitest-environment node
// Share-link codec tests. decodeStateFromUrl() reads window.location.hash, so
// a window shim is installed around each case (CompressionStream may be
// unavailable in node — the codec falls back to legacy base64 either way).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_STATE } from '../data/presets';
import { encodeStateToUrl, decodeStateFromUrl, SHARE_URL_WARN_LENGTH, clearScenarioFromUrl } from '../utils/urlEncoder';

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

beforeEach(() => {
  shimWindow('https://example.com/retirement-calculator/');
});

afterEach(() => {
  (globalThis as unknown as { window: unknown }).window = originalWindow;
});

describe('share-link round trip', () => {
  it('round-trips a full state losslessly (JSON equality)', async () => {
    const url = await encodeStateToUrl(DEFAULT_STATE);
    expect(url.startsWith('https://example.com/retirement-calculator/#scenario=')).toBe(true);
    shimWindow(url);
    const decoded = await decodeStateFromUrl();
    expect(decoded).not.toBeNull();
    expect(decoded).toEqual(DEFAULT_STATE);
  });

  it('shortens the payload vs raw percent-encoded JSON', async () => {
    const url = await encodeStateToUrl(DEFAULT_STATE);
    const rawLength = encodeURIComponent(JSON.stringify({ v: 1, state: DEFAULT_STATE })).length;
    const payload = url.split('#scenario=')[1] ?? '';
    expect(payload.length).toBeLessThan(rawLength);
    expect(payload.length).toBeLessThan(SHARE_URL_WARN_LENGTH);
  });

  it('rejects malformed / tampered payload types', async () => {
    shimWindow('https://example.com/#scenario=' + btoa(encodeURIComponent(JSON.stringify({ v: 1, state: 'oops' }))));
    expect(await decodeStateFromUrl()).toBeNull();
    shimWindow('https://example.com/#scenario=' + btoa(encodeURIComponent(JSON.stringify([1, 2]))));
    expect(await decodeStateFromUrl()).toBeNull();
    shimWindow('https://example.com/#scenario=' + btoa(encodeURIComponent(JSON.stringify(42))));
    expect(await decodeStateFromUrl()).toBeNull();
    shimWindow('https://example.com/#scenario=zzzz!!!');
    expect(await decodeStateFromUrl()).toBeNull();
  });

  it('rejects an oversized hash payload', async () => {
    shimWindow('https://example.com/#scenario=' + 'A'.repeat(200001));
    expect(await decodeStateFromUrl()).toBeNull();
  });

  it('returns null when no scenario is embedded and clearScenarioFromUrl is safe', async () => {
    shimWindow('https://example.com/');
    expect(await decodeStateFromUrl()).toBeNull();
    expect(() => clearScenarioFromUrl()).not.toThrow();
  });
});