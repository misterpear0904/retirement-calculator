import React, { useState, useMemo } from 'react';
import { Save, Trash2, FolderOpen, GitCompareArrows, Plus } from 'lucide-react';
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

function kpiRows(a: SimulationResult, b: SimulationResult) {
  const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;
  return [
    { label: 'Success rate', a: `${a.successRate}%`, b: `${b.successRate}%`, delta: b.successRate - a.successRate, suffix: 'pts' },
    { label: 'Net worth at retirement', a: fmt$(a.targetRetirementNetWorth), b: fmt$(b.targetRetirementNetWorth), delta: b.targetRetirementNetWorth - a.targetRetirementNetWorth, suffix: '$' },
    { label: 'Net worth at horizon', a: fmt$(a.finalNetWorth), b: fmt$(b.finalNetWorth), delta: b.finalNetWorth - a.finalNetWorth, suffix: '$' },
    { label: 'FIRE age', a: a.fireAgeAchievable ? `Age ${a.fireAgeAchievable}` : '—', b: b.fireAgeAchievable ? `Age ${b.fireAgeAchievable}` : '—', delta: (a.fireAgeAchievable ?? 99) - (b.fireAgeAchievable ?? 99), suffix: 'yrs' },
    { label: 'Lifetime taxes', a: fmt$(a.lifetimeTaxesPaid), b: fmt$(b.lifetimeTaxesPaid), delta: a.lifetimeTaxesPaid - b.lifetimeTaxesPaid, suffix: '$' },
  ];
}

function formatDelta(delta: number, suffix: string): string {
  const sign = delta > 0 ? '+' : '';
  if (suffix === '$') {
    const abs = Math.abs(Math.round(delta));
    const str = abs >= 1000000 ? `$${(abs / 1000000).toFixed(1)}M` : `$${abs.toLocaleString()}`;
    return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${str}`;
  }
  void sign;
  return `${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}${suffix === 'pts' ? ' pts' : suffix === 'yrs' ? ' yrs' : suffix}`;
}

export const ScenariosTab: React.FC<Props> = ({ state, currentResult, onLoadState, onTriggerToast }) => {
  const [saved, setSaved] = useState<SavedScenario[]>(() => listScenarios());
  const [name, setName] = useState('');
  const [compareId, setCompareId] = useState<string | null>(null);

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

  const handleSave = () => {
    const entry = saveScenario(name || `Scenario ${saved.length + 1}`, state);
    setSaved(listScenarios());
    setName('');
    setCompareId(entry.id);
    onTriggerToast(`Saved scenario "${entry.name}"`);
  };

  const compareName = saved.find((s) => s.id === compareId)?.name ?? '';

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div>
        <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <GitCompareArrows className="w-4.5 h-4.5 text-blue-400 shrink-0" /> Scenario Compare
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
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
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
        <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl p-4 text-center">
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
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex-1 min-w-[160px]">
                <div className="text-xs font-bold text-slate-100">{s.name}</div>
                <div className="text-[10px] text-slate-500">
                  Saved {new Date(s.savedAt).toLocaleDateString()} · retire {s.state.targetRetirementAge} · save {s.state.savingsRatePct}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareId(compareId === s.id ? null : s.id)}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  compareId === s.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> {compareId === s.id ? 'Comparing' : 'Compare'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onLoadState(sanitizeRetirementState({ ...s.state }));
                  onTriggerToast(`Loaded scenario "${s.name}"`);
                }}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Load
              </button>
              <button
                type="button"
                aria-label={`Delete scenario ${s.name}`}
                onClick={() => {
                  setSaved(deleteScenario(s.id));
                  if (compareId === s.id) setCompareId(null);
                }}
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
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Current plan vs <span className="text-purple-400">{compareName}</span> <span className="font-medium normal-case">(B − A)</span>
          </h4>

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
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(age) => `Age ${age}`}
                  formatter={(value: any, label: any) => [`$${Math.round(value).toLocaleString()}`, label === 'current' ? 'Current (A)' : `${compareName} (B)`]}
                />
                <Area type="monotone" dataKey="current" name="current" stroke="#38bdf8" strokeWidth={2.5} fill="#38bdf8" fillOpacity={0.15} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
                <Area type="monotone" dataKey="compare" name="compare" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 4" fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 text-left">
                  <th className="px-4 py-2.5 font-semibold">Metric</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Current (A)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">{compareName} (B)</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Δ (B − A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {kpiRows(currentResult, compareResult).map((r) => (
                  <tr key={r.label} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-slate-300 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5 text-right text-slate-200 font-mono">{r.a}</td>
                    <td className="px-4 py-2.5 text-right text-purple-300 font-mono">{r.b}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.delta > 0 ? 'text-emerald-400' : r.delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {formatDelta(r.delta, r.suffix)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
