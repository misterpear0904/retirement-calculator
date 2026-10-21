import React, { useState, useRef, useEffect } from 'react';
import { RetirementState, SimulationResult } from '../../types/retirement';
import { solveRetirementAge, solveSavingsRate } from '../../utils/solver';
import { InfoTip } from '../InfoTip';

interface SolverTabProps {
  state: RetirementState;
  baselineResult: SimulationResult | null;
  onTriggerToast?: (msg: string) => void;
  /** Caller applies the found retirement age back into the plan. */
  onSelectRetirementAge?: (age: number) => void;
}

/**
 * Reverse solver tab: instead of "what happens to my plan", answer
 * "what plan hits my goal" — the earliest retirement age (or lowest savings
 * rate) that keeps Monte Carlo success at or above a chosen target.
 */
export function SolverTab({ state, onTriggerToast, onSelectRetirementAge }: SolverTabProps) {
  const [targetRate, setTargetRate] = useState(90);
  const [busy, setBusy] = useState<'age' | 'savings' | null>(null);
  const [ageResult, setAgeResult] = useState<number | null | undefined>(undefined);
  const [savingsResult, setSavingsResult] = useState<number | null | undefined>(undefined);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const runSolve = (kind: 'age' | 'savings') => {
    setBusy(kind);
    // Yield a frame so the busy state paints before the synchronous search.
    timerRef.current = window.setTimeout(() => {
      try {
        const trials = 300;
        const result =
          kind === 'age'
            ? solveRetirementAge(state, { targetSuccessRate: targetRate, trials })
            : solveSavingsRate(state, { targetSuccessRate: targetRate, trials });
        if (kind === 'age') setAgeResult(result);
        else setSavingsResult(result);
        onTriggerToast?.(
          result == null
            ? `No plan reaches ${targetRate}% success — loosen the target or the plan.`
            : kind === 'age'
              ? `Solved: retire at ${result} to hit ${targetRate}% success.`
              : `Solved: save ${result}% of income to hit ${targetRate}% success.`
        );
      } finally {
        setBusy(null);
        timerRef.current = null;
      }
    }, 20);
  };

  const cardCls =
    'dark:bg-slate-900/70 bg-white rounded-2xl border dark:border-slate-700/50 border-slate-200 p-5 space-y-3';
  const btnCls =
    'px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait transition';

  return (
    <div className="space-y-4" aria-label="Reverse solver">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600">Reverse Solver</h3>
        <InfoTip term="sequenceRisk" />
      </div>
      <p className="text-xs dark:text-slate-400 text-slate-600 max-w-2xl">
        Instead of asking what your plan produces, ask what plan hits your goal. The solver
        binary-searches the engine (Monte Carlo, ~300 trials per probe) for the
        earliest retirement age — or lowest savings rate — that still meets your
        target success rate.
      </p>

      <div className={cardCls}>
        <label className="text-xs font-semibold dark:text-slate-300 text-slate-700 flex items-center justify-between" htmlFor="solve-target-rate">
          Target success rate
          <span className="font-bold text-blue-400">{targetRate}%</span>
        </label>
        <input
          id="solve-target-rate"
          type="range"
          min={60}
          max={99}
          step={1}
          value={targetRate}
          onChange={(e) => setTargetRate(Number(e.target.value))}
          className="w-full accent-blue-500"
          aria-label="Target Monte Carlo success rate"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold dark:text-slate-300 text-slate-700">Earliest safe retirement age</div>
            {busy === 'age' ? (
              <div className="text-sm dark:text-slate-400 text-slate-600" role="status">Searching…</div>
            ) : ageResult === undefined ? (
              <div className="text-sm text-slate-500 italic">Not solved yet</div>
            ) : ageResult === null ? (
              <div className="text-sm text-amber-400">No plan reaches this target — loosen it.</div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">Age {ageResult}</span>
                <button type="button" className={btnCls} onClick={() => onSelectRetirementAge?.(ageResult)}>
                  Apply to plan
                </button>
              </div>
            )}
            <button type="button" className={btnCls} disabled={busy != null} onClick={() => runSolve('age')}>
              {busy === 'age' ? 'Solving…' : 'Solve retirement age'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold dark:text-slate-300 text-slate-700">Minimum savings rate</div>
            {busy === 'savings' ? (
              <div className="text-sm dark:text-slate-400 text-slate-600" role="status">Searching…</div>
            ) : savingsResult === undefined ? (
              <div className="text-sm text-slate-500 italic">Not solved yet</div>
            ) : savingsResult === null ? (
              <div className="text-sm text-amber-400">No plan reaches this target — loosen it.</div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">{savingsResult}%</span>
                <span className="text-xs text-slate-500">of household income</span>
              </div>
            )}
            <button type="button" className={btnCls} disabled={busy != null} onClick={() => runSolve('savings')}>
              {busy === 'savings' ? 'Solving…' : 'Solve savings rate'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Tip: the savings-rate solve ignores fixed-contribution mode and works in % of income.
          Solving takes a few seconds — each probe replays your horizon hundreds of times.
        </p>
      </div>
    </div>
  );
}

export default SolverTab;
