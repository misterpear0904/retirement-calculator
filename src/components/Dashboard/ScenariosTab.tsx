import React, { useState, useMemo } from 'react';
import { Save, Trash2, FolderOpen, GitCompareArrows, Plus, ListChecks } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RetirementState, SimulationResult } from '../../types/retirement';
import { runRetirementSimulation } from '../../utils/calculatorEngine';
import { sanitizeRetirementState } from '../../utils/validation';
import { listScenarios, saveScenario, deleteScenario, SavedScenario } from '../../utils/scenarios';
import { InfoTip } from '../InfoTip';

interface Props {
  state: RetirementState;
  currentResult: SimulationResult;
  onLoadState: (state: RetirementState) => void;
  onTriggerToast: (msg: string) => void;
}

/** Matches the hard cap inside utils/scenarios.ts (slice(-20)). */
const SCENARIO_LIMIT = 20;

/** True when the app is in dark mode (Tailwind `dark` class on <html>). */
function isDarkChartTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}
const STORAGE_ERROR_MSG =
  'Save failed (localStorage full or blocked) — try deleting old scenarios or use Export';

/** RetiredState keys that are arrays — shown as "count X vs Y" rows instead of per-item diffs. */
const ARRAY_KEYS = new Set(['debts', 'children', 'customCategories']);

/** Simple objects in RetirementState whose fields get per-field diff rows. */
function isPlainObjectKey(key: string): boolean {
  return ['partner', 'contributionSplit', 'spendingSmile'].includes(key);
}

export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function formatDiffValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : String(v);
  return String(v);
}

export function valuesDiffer(a: unknown, b: unknown): boolean {
  return String(a) !== String(b);
}

interface DiffRow {
  label: string;
  old: string;
  new: string;
}

/** Top-level state diff: scalars directly, objects per-field, arrays as counts. */
export function computeStateDiff(saved: RetirementState, current: RetirementState): DiffRow[] {
  const rows: DiffRow[] = [];
  const keys = Array.from(new Set([...Object.keys(saved), ...Object.keys(current)])).sort();

  for (const key of keys) {
    const oldVal = saved[key as keyof RetirementState];
    const newVal = current[key as keyof RetirementState];
    const label = humanizeKey(key);

    if (ARRAY_KEYS.has(key)) {
      const oldLen = Array.isArray(oldVal) ? oldVal.length : 0;
      const newLen = Array.isArray(newVal) ? newVal.length : 0;
      if (oldLen !== newLen) {
        rows.push({ label, old: `${oldLen} item${oldLen === 1 ? '' : 's'}`, new: `${newLen} item${newLen === 1 ? '' : 's'}` });
      }
      continue;
    }

    if (isPlainObjectKey(key)) {
      const oldObj = (oldVal ?? {}) as Record<string, unknown>;
      const newObj = (newVal ?? {}) as Record<string, unknown>;
      const subKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort();
      for (const sub of subKeys) {
        if (valuesDiffer(oldObj[sub], newObj[sub])) {
          rows.push({
            label: `${label} · ${humanizeKey(sub)}`,
            old: formatDiffValue(oldObj[sub]),
            new: formatDiffValue(newObj[sub]),
          });
        }
      }
      continue;
    }

    if (valuesDiffer(oldVal, newVal)) {
      rows.push({ label, old: formatDiffValue(oldVal), new: formatDiffValue(newVal) });
    }
  }
  return rows;
}

export function kpiRows(a: SimulationResult, b: SimulationResult) {
  const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const fmtAge = (v: number | null) => (v != null ? `Age ${v}` : '—');
  return [
    { label: 'Success rate', a: `${a.successRate}%`, b: `${b.successRate}%`, delta: b.successRate - a.successRate, suffix: 'pts', higherIsBetter: true },
    { label: 'Net worth at retirement', a: fmt$(a.targetRetirementNetWorth), b: fmt$(b.targetRetirementNetWorth), delta: b.targetRetirementNetWorth - a.targetRetirementNetWorth, suffix: '$', higherIsBetter: true },
    { label: 'Net worth at horizon', a: fmt$(a.finalNetWorth), b: fmt$(b.finalNetWorth), delta: b.finalNetWorth - a.finalNetWorth, suffix: '$', higherIsBetter: true },
    // FIRE age and taxes: lower is better, but delta stays B − A like every row.
    // When either side lacks a FIRE age, the delta is undefined (show "—").
    { label: 'FIRE age', a: fmtAge(a.fireAgeAchievable), b: fmtAge(b.fireAgeAchievable), delta: (a.fireAgeAchievable == null || b.fireAgeAchievable == null) ? null : (b.fireAgeAchievable - a.fireAgeAchievable), suffix: 'yrs', higherIsBetter: false },
    { label: 'Lifetime taxes', a: fmt$(a.lifetimeTaxesPaid), b: fmt$(b.lifetimeTaxesPaid), delta: b.lifetimeTaxesPaid - a.lifetimeTaxesPaid, suffix: '$', higherIsBetter: false },
  ];
}

export function formatDelta(delta: number | null, suffix: string): string {
  if (delta == null) return '—';
  const rounded = suffix === '$' ? Math.round(delta) : Math.round(delta * 10) / 10;
  if (rounded === 0) return '—';
  const sign = rounded < 0 ? '−' : '+';
  if (suffix === '$') {
    const abs = Math.abs(rounded);
    const str = abs >= 1000000 ? `$${(abs / 1000000).toFixed(1)}M` : `$${abs.toLocaleString()}`;
    return `${sign}${str}`;
  }
  return `${sign}${Math.abs(rounded)}${suffix === 'pts' ? ' pts' : ' yrs'}`;
}

export function deltaIsGood(delta: number, higherIsBetter: boolean): boolean | null {
  if (Math.abs(delta) < 0.005) return null;
  return higherIsBetter ? delta > 0 : delta < 0;
}

export const ScenariosTab: React.FC<Props> = ({ state, currentResult, onLoadState, onTriggerToast }) => {
  const [saved, setSaved] = useState<SavedScenario[]>(() => listScenarios());
  const [name, setName] = useState('');
  const [compareId, setCompareId] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const compareState = useMemo(() => {
    const found = saved.find((s) => s.id === compareId);
    return found ? sanitizeRetirementState({ ...found.state }) : null;
  }, [saved, compareId]);

  const compareResult = useMemo(
    () => (compareState ? runRetirementSimulation(compareState) : null),
    [compareState]
  );

  const overlayData = useMemo(() => {
    if (!compareResult) return [];
    const bByAge = new Map(compareResult.yearlyProjections.map((p) => [p.age, p.netWorth50]));
    return currentResult.yearlyProjections.map((p) => ({
      age: p.age,
      current: p.netWorth50,
      compare: bByAge.get(p.age) ?? null,
    }));
  }, [currentResult, compareResult]);

  // Saved-vs-current input diff ("What changed?"). Both sides pass through the
  // same sanitizer so defaults don't show up as phantom changes.
  const stateDiff = useMemo(
    () =>
      compareState ? computeStateDiff(compareState, sanitizeRetirementState({ ...state })) : [],
    [compareState, state]
  );

  const handleSave = () => {
    try {
      const wasAtLimit = saved.length >= SCENARIO_LIMIT;
      const entry = saveScenario(name || `Scenario ${saved.length + 1}`, state);
      // Scenario writes are swallowed silently in utils/scenarios.ts, so verify
      // the entry actually landed to detect quota / private-mode failures.
      const after = listScenarios();
      setSaved(after);
      if (!after.some((s) => s.id === entry.id)) {
        onTriggerToast(STORAGE_ERROR_MSG);
        return;
      }
      setName('');
      setCompareId(entry.id);
      onTriggerToast(
        wasAtLimit
          ? `Scenario limit reached — replaced oldest save (${after.length} kept)`
          : `Saved scenario "${entry.name}"`
      );
    } catch {
      onTriggerToast(STORAGE_ERROR_MSG);
    }
  };

  const handleLoad = (s: SavedScenario) => {
    try {
      onLoadState(sanitizeRetirementState({ ...s.state }));
      onTriggerToast(`Loaded scenario "${s.name}"`);
    } catch {
      onTriggerToast('Load failed — the scenario may be corrupted. Try re-saving it.');
    }
  };

  const handleDelete = (id: string) => {
    try {
      setSaved(deleteScenario(id));
      if (compareId === id) setCompareId(null);
    } catch {
      onTriggerToast('Delete failed (localStorage blocked) — the scenario is still saved.');
    }
  };

  const compareName = saved.find((s) => s.id === compareId)?.name ?? '';

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div>
        <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4 text-blue-400 shrink-0" /> Scenario Compare
          <InfoTip term="scenarios" />
        </h3>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
          Snapshot your full inputs, tweak the plan, then compare the two futures side by side.
        </p>
      </div>

      {/* Save current */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Name this snapshot (e.g. Retire ${state.targetRetirementAge} ${state.taxFilingStatus === 'joint' ? 'joint' : ''})`}
          maxLength={60}
          className="flex-1 min-w-[200px] dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold dark:text-slate-100 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-glow"
        >
          <Save className="w-4 h-4" /> Save current as scenario
        </button>
      </div>

      {/* Saved list */}
      {saved.length === 0 ? (
        <p className="text-xs text-slate-500 border border-dashed dark:border-slate-700 border-slate-300 rounded-xl p-4 text-center">
          No saved scenarios yet. Save one, change an input or two, then compare.
        </p>
      ) : (
        <div className="space-y-2">
          {saved.map((s) => (
            <div
              key={s.id}
              className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border transition-colors ${
                compareId === s.id
                  ? 'bg-purple-500/10 border-purple-500/40'
                  : 'dark:bg-slate-900/60 bg-slate-100 dark:border-slate-800 border-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex-1 min-w-[160px]">
                <div className="text-xs font-bold dark:text-slate-100 text-slate-900">{s.name}</div>
                <div className="text-[10px] text-slate-500">
                  {`Saved ${new Date(s.savedAt).toLocaleDateString()} · retire ${s.state.targetRetirementAge} · save ${s.state.savingsRatePct}%`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareId(compareId === s.id ? null : s.id)}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  compareId === s.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 dark:border-slate-700 border-slate-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> {compareId === s.id ? 'Comparing' : 'Compare'}
              </button>
              <button
                type="button"
                onClick={() => handleLoad(s)}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-300 hover:text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Load
              </button>
              <button
                type="button"
                aria-label={`Delete scenario ${s.name}`}
                onClick={() => handleDelete(s.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Comparison */}
      {compareResult && compareState && (
        <div className="space-y-4 pt-2 border-t dark:border-slate-800 border-slate-200 animate-fade-in">
          <h4 className="text-xs font-extrabold uppercase tracking-wider dark:text-slate-400 text-slate-600 flex items-center justify-between gap-3 flex-wrap">
            <span>
              Current plan vs <span className="text-purple-400">{compareName}</span> <span className="font-medium normal-case">(B − A)</span>
            </span>
            <button
              type="button"
              onClick={() => setDiffOpen((v) => !v)}
              aria-expanded={diffOpen}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-300 hover:text-white normal-case tracking-normal transition-colors"
            >
              <ListChecks className="w-3.5 h-3.5" />
              What changed? {diffOpen ? '(hide)' : `(${stateDiff.length})`}
            </button>
          </h4>

          {/* Saved-input diff drill-down: old (saved) → new (current) for every differing field */}
          {diffOpen && (
            <div className="rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-slate-100 overflow-hidden animate-fade-in">
              {stateDiff.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">
                  All inputs match the current plan — the difference is pure market math.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="dark:bg-slate-900 bg-white dark:text-slate-400 text-slate-600 text-left sticky top-0">
                      <tr>
                        <th scope="col" className="px-4 py-2 font-semibold">Input</th>
                        <th scope="col" className="px-4 py-2 font-semibold text-right">{compareName} (saved)</th>
                        <th scope="col" className="px-4 py-2 font-semibold text-right">Current</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stateDiff.map((row) => (
                        <tr key={row.label} className="hover:bg-slate-800/40">
                          <td className="px-4 py-2 dark:text-slate-300 text-slate-700 font-medium">{row.label}</td>
                          <td className="px-4 py-2 text-right font-mono text-purple-300">{row.old}</td>
                          <td className="px-4 py-2 text-right font-mono text-amber-300">{row.new}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={overlayData} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="age" stroke="#64748b" tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" yrs" minTickGap={32} />
                <YAxis
                  stroke="#64748b"
                  width={64}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(n: number) => {
                    const a = Math.abs(n);
                    const s = n < 0 ? '-' : '';
                    if (a >= 1000000) return `${s}$${(a / 1000000).toFixed(0)}M`;
                    if (a >= 1000) return `${s}$${Math.round(a / 1000)}k`;
                    return `${s}$${a}`;
                  }}
                />
                <Tooltip
                  // Theme-aware (round-3 task 7): match the theme instead of a
                  // hardcoded dark-navy popover. App re-renders on theme
                  // toggle, so re-reading the `dark` root class is safe.
                  contentStyle={{
                    backgroundColor: isDarkChartTheme() ? '#0f172a' : '#ffffff',
                    border: isDarkChartTheme() ? '1px solid #334155' : '1px solid #cbd5e1',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: isDarkChartTheme() ? '#e2e8f0' : '#334155', fontWeight: 700 }}
                  itemStyle={{ color: isDarkChartTheme() ? '#cbd5e1' : '#475569' }}
                  labelFormatter={(age) => `Age ${age}`}
                  formatter={(value: unknown, label: unknown) => [`$${Math.round(Number(value)).toLocaleString()}`, String(label) === 'current' ? 'Current (A)' : `${compareName} (B)`]}
                />
                <Area type="monotone" dataKey="current" name="current" stroke="#38bdf8" strokeWidth={2.5} fill="#38bdf8" fillOpacity={0.15} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
                <Area type="monotone" dataKey="compare" name="compare" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 4" fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border dark:border-slate-800 border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="dark:bg-slate-900/80 bg-white/80 dark:text-slate-400 text-slate-600 text-left">
                  <th className="px-4 py-2.5 font-semibold">Metric</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Current (A)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">{compareName} (B)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Δ (B − A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {kpiRows(currentResult, compareResult).map((r) => {
                  const good = r.delta == null ? null : deltaIsGood(r.delta, r.higherIsBetter);
                  return (
                    <tr key={r.label} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700 font-medium">{r.label}</td>
                      <td className="px-4 py-2.5 text-right dark:text-slate-200 text-slate-800 font-mono">{r.a}</td>
                      <td className="px-4 py-2.5 text-right text-purple-300 font-mono">{r.b}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${good == null ? 'text-slate-500' : good ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatDelta(r.delta, r.suffix)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
