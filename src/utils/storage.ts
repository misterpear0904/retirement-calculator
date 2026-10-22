import { RetirementState } from '../types/retirement';

const STORAGE_KEY = 'apexretire-saved-state-v1';

interface StoredPayload {
  v: number;
  savedAt: string;
  state: Partial<RetirementState>;
}

/** Persist the current inputs so they survive reloads and revisits. */
export function saveStateToStorage(state: RetirementState): void {
  try {
    const payload: StoredPayload = {
      v: 1,
      savedAt: new Date().toISOString(),
      state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / private mode — non-fatal, session just won't persist.
  }
}

/** Load previously autosaved inputs, or null when none exist / invalid. */
export function loadStateFromStorage(): Partial<RetirementState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload | Partial<RetirementState>;
    // Apply exactly one versioned snapshot: a payload stamped with a version we
    // don't understand (e.g. a newer build in a shared profile) must never be
    // blindly spread onto live state. Legacy unversioned payloads are still
    // accepted so upgrades restore.
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'v' in (parsed as StoredPayload) &&
      (parsed as StoredPayload).v !== 1
    ) {
      return null;
    }
    const candidate =
      parsed !== null &&
      typeof parsed === 'object' &&
      'state' in parsed &&
      typeof (parsed as StoredPayload).state === 'object'
        ? (parsed as StoredPayload).state
        : (parsed as Partial<RetirementState>);
    if (typeof candidate !== 'object' || candidate === null) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function clearStoredState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}
