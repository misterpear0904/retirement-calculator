import { RetirementState } from '../types/retirement';

const SCENARIO_KEY = 'scenario';
const SCENARIO_VERSION = 1;

/** Marks a deflate-compressed payload. Anything else is treated as legacy raw base64. */
const COMPRESSED_PREFIX = 'z';

/** Share URLs above this length are unreliable across browsers; warn instead of silently failing. */
export const SHARE_URL_WARN_LENGTH = 7500;

interface VersionedPayload {
  v: number;
  state: Partial<RetirementState>;
}

function compressionAvailable(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw' as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
  return new Response(stream).text();
}

/**
 * Serialize state into a shareable URL.
 *
 * Raw base64 of percent-encoded JSON inflates ~2x and overruns practical URL
 * limits for any non-trivial plan, so payloads are deflate-compressed and
 * base64url-encoded. Falls back to the legacy encoding where CompressionStream
 * is unavailable; the decoder handles both.
 */
export async function encodeStateToUrl(state: RetirementState): Promise<string> {
  try {
    const payload: VersionedPayload = { v: SCENARIO_VERSION, state };
    const jsonStr = JSON.stringify(payload);
    let encoded: string;
    if (compressionAvailable()) {
      encoded = COMPRESSED_PREFIX + bytesToBase64Url(await deflate(jsonStr));
    } else {
      encoded = btoa(encodeURIComponent(jsonStr));
    }
    const url = new URL(window.location.href);
    url.hash = `${SCENARIO_KEY}=${encoded}`;
    return url.toString();
  } catch (err) {
    console.error('Error encoding state to URL', err);
    return window.location.href;
  }
}

function isPlausibleState(obj: unknown): obj is Partial<RetirementState> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  // Spot-check a few numeric fields; full sanitization happens in validation.ts.
  for (const key of ['currentAge', 'targetRetirementAge', 'lifeExpectancy']) {
    if (key in o && typeof o[key] !== 'number') return false;
  }
  return true;
}

export async function decodeStateFromUrl(): Promise<Partial<RetirementState> | null> {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes(`${SCENARIO_KEY}=`)) return null;

    const base64 = hash.split(`${SCENARIO_KEY}=`)[1]?.split('&')[0];
    if (!base64) return null;

    const jsonStr = base64.startsWith(COMPRESSED_PREFIX)
      ? await inflate(base64UrlToBytes(base64.slice(COMPRESSED_PREFIX.length)))
      : decodeURIComponent(atob(base64)); // legacy uncompressed payload
    const parsed: unknown = JSON.parse(jsonStr);

    // A versioned envelope must unwrap to a real state object. Without this check a
    // payload like {"v":1,"state":"oops"} fails the typeof test below and the whole
    // envelope is mistaken for the state, injecting "v"/"state" keys into the app.
    let candidate: unknown = parsed;
    if (parsed !== null && typeof parsed === 'object' && 'v' in (parsed as Record<string, unknown>)) {
      candidate = (parsed as VersionedPayload).state;
    }
    // Reject primitives and arrays in either position.
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

    if (!isPlausibleState(candidate)) return null;
    return candidate;
  } catch (err) {
    console.error('Error decoding state from URL', err);
    return null;
  }
}

/** Remove the scenario hash after successful load so back/refresh stays clean. */
export function clearScenarioFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (url.hash.includes(SCENARIO_KEY)) {
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    }
  } catch {
    // non-fatal
  }
}