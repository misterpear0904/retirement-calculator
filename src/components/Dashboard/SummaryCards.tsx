import React from 'react';
import { ShieldCheck, Calendar, DollarSign, Flame, MapPin, Plus, Minus, TrendingUp } from 'lucide-react';
import { SimulationResult, RetirementState } from '../../types/retirement';

interface Props {
  result: SimulationResult;
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
}

export const SummaryCards: React.FC<Props> = ({ result, state, onChange }) => {
  const {
    successRate,
    targetRetirementNetWorth,
    finalNetWorthAge90,
    fireAgeAchievable,
    safeWithdrawalRatePct,
    monthlyRetirementSpending,
    targetLocationName,
    colMultiplier,
    yearlyProjections,
  } = result;

  // Wealth at age 65 projection
  const projAt65 = yearlyProjections.find((p) => p.age === 65)?.totalPortfolio || targetRetirementNetWorth;

  const getSuccessStatus = (rate: number) => {
    if (rate >= 85) return { label: 'Very Safe', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
    if (rate >= 70) return { label: 'On Track', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' };
    if (rate >= 50) return { label: 'Moderate Risk', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
    return { label: 'High Risk', color: 'text-red-400 border-red-500/40 bg-red-500/10' };
  };

  const status = getSuccessStatus(successRate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Bento Tile 1: Featured Large Tile - Success Confidence Score (5 Cols) */}
      <div className="md:col-span-5 glass-panel p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between border-blue-500/30 shadow-glow">
        <div>
          <div className="flex justify-between items-start mb-3 gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-400 shrink-0" /> Success Confidence Score
            </span>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border shrink-0 ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight dark:text-white text-slate-900">{successRate}%</span>
            <span className="text-xs dark:text-slate-400 text-slate-500 font-medium">Monte Carlo Confidence</span>
          </div>

          {/* Progress Bar Meter */}
          <div className="w-full dark:bg-slate-800 bg-slate-200 h-3 rounded-full overflow-hidden my-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                successRate >= 85
                  ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                  : successRate >= 70
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  : 'bg-gradient-to-r from-amber-500 to-red-500'
              }`}
              style={{ width: `${Math.min(100, successRate)}%` }}
            />
          </div>
        </div>

        <p className="text-xs dark:text-slate-400 text-slate-500 border-t dark:border-slate-800/80 border-slate-200 pt-3 mt-3 leading-relaxed">
          Calculated across 500 stochastic market return & inflation trials.
        </p>
      </div>

      {/* Bento Tile 2: Estimated Retirement Age with Inline Quick Toggles (7 Cols grid layout) */}
      <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Tile 2A: Estimated Retirement Age */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group hover:border-emerald-500/40 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" /> Target Retirement Age
              </span>
              {fireAgeAchievable && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  FIRE Age {fireAgeAchievable}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2.5 my-3">
              <span className="text-3xl font-extrabold dark:text-slate-100 text-slate-900">Age {state.targetRetirementAge}</span>
              <span className="text-xs dark:text-slate-400 text-slate-500">({state.targetRetirementAge - state.currentAge} yrs away)</span>
            </div>
          </div>

          {/* Inline Quick Adjuster Buttons */}
          <div className="flex items-center justify-between dark:bg-slate-900/80 bg-slate-100 p-2 rounded-xl border dark:border-slate-800 border-slate-200 text-xs mt-3">
            <span className="dark:text-slate-400 text-slate-500 text-xs font-medium pl-1">Quick Adjust</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    targetRetirementAge: Math.max(state.currentAge + 1, state.targetRetirementAge - 1),
                  })
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    targetRetirementAge: Math.min(85, state.targetRetirementAge + 1),
                  })
                }
                className="w-8 h-8 flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tile 2B: Projected Wealth at Age 65 */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group hover:border-purple-500/40 transition-colors">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500 shrink-0" /> Projected Wealth at 65
              </span>
            </div>

            <div className="my-3">
              <span className="text-3xl font-extrabold text-purple-400 tracking-tight">
                ${Math.round(projAt65).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-xs dark:text-slate-400 text-slate-500 border-t dark:border-slate-800/80 border-slate-200 pt-3 mt-3 leading-relaxed">
            Retirement Net Worth: <strong className="dark:text-slate-200 text-slate-800">${Math.round(targetRetirementNetWorth).toLocaleString()}</strong>
          </p>
        </div>

        {/* Tile 2C: Monthly Retirement Budget */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group">
          <div>
            <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400 shrink-0" /> Monthly Spending Budget
            </span>

            <div className="my-3">
              <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
                ${Math.round(monthlyRetirementSpending).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-medium"> /mo</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 border-t border-slate-800/80 pt-3 mt-3 leading-relaxed truncate" title={`Adjusted for ${targetLocationName} (${colMultiplier}x COL)`}>
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Adjusted for {targetLocationName} ({colMultiplier}x COL)</span>
          </p>
        </div>

        {/* Tile 2D: Savings Rate & SWR with Inline Quick Toggles */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group">
          <div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" /> Savings Rate & SWR
              </span>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                SWR: {safeWithdrawalRatePct}%
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-3">
              <span className="text-3xl font-extrabold text-emerald-400">{state.savingsRatePct}%</span>
              <span className="text-xs text-slate-400 font-medium">of salary saved</span>
            </div>
          </div>

          {/* Inline Quick Savings Rate Adjuster */}
          <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-xs mt-3">
            <span className="text-slate-400 text-xs font-medium pl-1">Savings Rate</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ savingsRatePct: Math.max(0, state.savingsRatePct - 1) })}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange({ savingsRatePct: Math.min(75, state.savingsRatePct + 1) })}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
