import { RetirementState } from '../types/retirement';

export function encodeStateToUrl(state: RetirementState): string {
  try {
    const jsonStr = JSON.stringify(state);
    const base64 = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `scenario=${base64}`;
    return url.toString();
  } catch (err) {
    console.error('Error encoding state to URL', err);
    return window.location.href;
  }
}

export function decodeStateFromUrl(): Partial<RetirementState> | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('scenario=')) return null;

    const base64 = hash.split('scenario=')[1];
    if (!base64) return null;

    const jsonStr = decodeURIComponent(atob(base64));
    return JSON.parse(jsonStr) as Partial<RetirementState>;
  } catch (err) {
    console.error('Error decoding state from URL', err);
    return null;
  }
}
