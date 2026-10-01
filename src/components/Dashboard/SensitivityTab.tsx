import React, { useState } from 'react';
import { Activity, Play } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import { runRetirementSimulation } from '../../utils/calculatorEngine';
import { InfoTip } from '../InfoTip';

interface Props {
  state: RetirementState;
}

interface FactorDef {
  id: string;
  label: string;
  apply: (s: RetirementState, dir: 1 | -1) => RetirementState;
}

const FACTORS: FactorDef[] = [
  {
    id: 'savings',
    label: 'Savings rate ±5 pts',
    apply: (s, dir) => ({ ...s, savingsRatePct: Math.min(75, Math.max(0, s.savingsRatePct + dir * 5)) }),
  },
  {
    id: 'retireAge',
    label: 'Retire age ±2 yrs',
    apply: (s, dir) => {
      const t = Math.min(85, Math.max(s.currentAge + 1, s.targetRetirementAge + dir * 2));
      return { ...s, targetRetirementAge: t, lifeExpectancy: Math.max(t + 1, s.lifeExpectancy) };
    },
  },
  {
    id: 'stocks',
    label: 'Stocks ±10 pts',
    apply: (s, dir) => {
      const stock = Math.min(100, Math.max(0, s.stockPct + dir * 10));
      return { ...s, stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 };
    },
  },
  {
    id: 'spending',
    label: 'Spending ±10%',
    apply: (s, dir) => ({
      ...s,
      essentialExpensesMonthly: Math.max(0, s.essentialExpensesMonthly * (1 + dir * 0.1)),
      discretionaryExpensesMonthly: Math.max(0, s.discretionaryExpensesMonthly * (1 + dir * 0.1)),
    }),
  },
  {
    id: 'income',
    label: 'Income ±10%',
    apply: (s, dir) => ({ ...s, currentAnnualIncome: Math.max(0, s.currentAnnualIncome * (1 + dir * 0.1)) }),
  },
  {
    id: 'col',
    label: 'COL adjustment ±10 pts',
    apply: (s, dir) => ({ ...s, colAdjustmentPct: Math.min(50, Math.max(-50, s.colAdjustmentPct + dir * 10)) }),
  },
];

interface RowResult {
  id: string;
  label: string;
  down: number; // delta vs baseline, percentage points
  up: number;
}

export const SensitivityTab: React.FC<Props> = ({ state }) => {
  const [running, setRunning] = useState(false);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [rows, setRows] = useState<RowResult[] | null>(null);

  const run = () => {
    setRunning(true);
    // Let the loading state paint before the blocking sweep.
    setTimeout(() => {
      try {
        const base = runRetirementSimulation(state, { trials: 150 }).successRate;
        const out: RowResult[] = FACTORS.map((f) => {
          const downRate = runRetirementSimulation(f.apply(state, -1), { trials: 150 }).successRate;
          const upRate = runRetirementSimulation(f.apply(state, 1), { trials: 150 }).successRate;
          return { id: f.id, label: f.label, down: downRate - base, up: upRate - base };
        });
        out.sort((a, b) => Math.max(Math.abs(b.down), Math.abs(b.up)) - Math.max(Math.abs(a.down), Math.abs(a.up)));
        setBaseline(base);
        setRows(out);
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const maxAbs = rows ? Math.max(1, ...rows.flatMap((r) => [Math.abs(r.down), Math.abs(r.up)])) : 1;

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-amber-400 shrink-0" /> Sensitivity Analysis
            <InfoTip term="sensitivity" />
          </h3>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
            Which lever moves your success rate most? Each input is nudged while the rest freeze.
            {baseline != null && (
              <> Baseline success: <strong className="text-slate-200">{baseline}%</strong> (150-trial quick estimate).</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" /> {running ? 'Running 13 simulations…' : rows ? 'Re-run analysis' : 'Run analysis'}
        </button>
      </div>

      {rows && (
        <div className="space-y-2.5 animate-fade-in">
          {rows.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">{r.label}</span>
                <span className="font-mono text-slate-400">
                  <span className={r.down < 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {r.down > 0 ? '+' : ''}{r.down}
                  </span>
                  {' / '}
                  <span className={r.up < 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {r.up > 0 ? '+' : ''}{r.up}
                  </span>
                  {' pts'}
                </span>
              </div>
              <div className="relative h-3 rounded-full dark:bg-slate-800 bg-slate-200 overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500" />
                {/* down bar (left) */}
                <div
                  className={`absolute top-0 bottom-0 rounded-full ${r.down < 0 ? 'bg-red-500/80' : 'bg-emerald-500/80'}`}
                  style={{ right: '50%', width: `${(Math.abs(r.down) / maxAbs) * 50}%` }}
                />
                {/* up bar (right) */}
                <div
                  className={`absolute top-0 bottom-0 rounded-full ${r.up < 0 ? 'bg-red-500/80' : 'bg-emerald-500/80'}`}
                  style={{ left: '50%', width: `${(Math.abs(r.up) / maxAbs) * 50}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Left = nudged down, right = nudged up, in success-rate points. Quick 150-trial estimates — expect ±2 pts of noise; re-run to confirm close calls.
          </p>
        </div>
      )}
    </div>
  );
};
