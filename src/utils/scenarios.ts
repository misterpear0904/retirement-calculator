import { RetirementState } from '../types/retirement';

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  state: RetirementState;
}

const KEY = 'apexretire-scenarios-v1';

function readAll(): SavedScenario[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedScenario[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.id === 'string' && s.state && typeof s.state === 'object');
  } catch {
    return [];
  }
}

function writeAll(list: SavedScenario[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full / private mode — non-fatal
  }
}

export function listScenarios(): SavedScenario[] {
  return readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function saveScenario(name: string, state: RetirementState): SavedScenario {
  const clean = name.trim().slice(0, 60) || 'Untitled scenario';
  const entry: SavedScenario = {
    id: `scn_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: clean,
    savedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)) as RetirementState,
  };
  const list = readAll();
  list.push(entry);
  writeAll(list.slice(-20)); // keep the 20 most recent
  return entry;
}

export function deleteScenario(id: string): SavedScenario[] {
  const list = readAll().filter((s) => s.id !== id);
  writeAll(list);
  return list;
}
