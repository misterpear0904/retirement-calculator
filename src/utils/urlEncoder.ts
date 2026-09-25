import { RetirementState } from '../types/retirement';

const SCENARIO_KEY = 'scenario';
const SCENARIO_VERSION = 1;

interface VersionedPayload {
  v: number;
  state: Partial<RetirementState>;
}

export function encodeStateToUrl(state: RetirementState): string {
  try {
    const payload: VersionedPayload = { v: SCENARIO_VERSION, state };
    const jsonStr = JSON.stringify(payload);
    const base64 = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `${SCENARIO_KEY}=${base64}`;
    return url.toString();
  } catch (err) {
    console.error('Error encoding state to URL', err);
    return window.location.href;
  }
}

function isPlausibleState(obj: unknown): obj is Partial<RetirementState> {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  // Spot-check a few numeric fields; full sanitization happens in validation.ts.
  for (const key of ['currentAge', 'targetRetirementAge', 'lifeExpectancy']) {
    if (key in o && typeof o[key] !== 'number') return false;
  }
  return true;
}

export function decodeStateFromUrl(): Partial<RetirementState> | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes(`${SCENARIO_KEY}=`)) return null;

    const base64 = hash.split(`${SCENARIO_KEY}=`)[1]?.split('&')[0];
    if (!base64) return null;

    const jsonStr = decodeURIComponent(atob(base64));
    const parsed = JSON.parse(jsonStr) as VersionedPayload | Partial<RetirementState>;

    // Backwards compat: accept legacy bare-state payloads.
    const candidate =
      typeof (parsed as VersionedPayload).state === 'object' && parsed !== null && 'v' in (parsed as object)
        ? (parsed as VersionedPayload).state
        : (parsed as Partial<RetirementState>);

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
