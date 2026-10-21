import React from 'react';
import { ShieldCheck, Calendar, DollarSign, Flame, MapPin, Plus, Minus, TrendingUp, PiggyBank } from 'lucide-react';
import { SimulationResult, RetirementState } from '../../types/retirement';
import { getRiskLabel, getRiskCardClasses } from '../../utils/risk';
import { FINANCIAL_CONSTANTS, VALIDATION_LIMITS } from '../../utils/constants';
import { DIE_WITH_ZERO_MIN_SUCCESS_RATE, calcDieWithZero } from '../../utils/dieWithZero';
import { InfoTip } from '../InfoTip';
import { formatCurrency } from '../../utils/formatCurrency';
import { HISTORICAL_PRESETS } from '../../data/historicalReturns';

interface Props {
  result: SimulationResult;
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
}

export const SummaryCards: React.FC<Props> = ({ result, state, onChange }) => {
  const {
    successRate,
    historicalSuccessRate,
    targetRetirementNetWorth,
    fireAgeAchievable,
    coastFireAge,
    safeWithdrawalRatePct,
    retirementAnnualExpense,
    monthlyRetirementSpending,
    targetLocationName,
    colMultiplier,
    yearlyProjections,
  } = result;

  // Wealth at age 65 projection — null when 65 is outside the plan horizon.
  const projAt65 = yearlyProjections.find((p) => p.age === 65)?.totalPortfolio ?? null;

  const statusLabel = getRiskLabel(successRate);
  const statusClasses = getRiskCardClasses(successRate);

  // Label + description follow the active return simulation mode (P1 #5).
  const returnMode = state.returnMode ?? 'monte_carlo';
  const modeLabel =
    returnMode === 'deterministic'
      ? 'Deterministic'
      : returnMode === 'historical_real'
        ? 'Historical Real'
        : 'Monte Carlo';
  const historicalPreset =
    HISTORICAL_PRESETS.find((p) => p.id === (state.historicalInflationPreset ?? 'stagflation_1970s')) ??
    HISTORICAL_PRESETS.find((p) => p.id === 'stagflation_1970s') ??
    HISTORICAL_PRESETS[0];
  const presetLabel = historicalPreset ? `${historicalPreset.name} (${historicalPreset.yearsRange})` : '';
  const finalYear = historicalPreset?.data?.length
    ? historicalPreset.data[historicalPreset.data.length - 1]
    : null;
  const finalYearNote = finalYear
    ? ` — final year ${finalYear.year}: stock ${finalYear.stock >= 0 ? '+' : ''}${finalYear.stock}%, bond ${finalYear.bond >= 0 ? '+' : ''}${finalYear.bond}%, inflation ${finalYear.inflation}%`
    : '';
  const modeDescription =
    returnMode === 'deterministic'
      ? 'Calculated across 3 deterministic scenario paths (target, conservative, stress).'
      : returnMode === 'historical_real'
        ? `Calculated by replaying historical market returns and inflation year by year — ${presetLabel}; the final-year returns are held for the rest of the horizon${finalYearNote}.`
        : `Calculated across ${FINANCIAL_CONSTANTS.MONTE_CARLO_TRIALS} stochastic market return & inflation trials.`;

  // Die with Zero: only suggest spending the leftover from a plan that's on
  // track — never from one that's already at risk.
  const dieWithZero =
    successRate >= DIE_WITH_ZERO_MIN_SUCCESS_RATE ? calcDieWithZero(state, result) : null;

  // P1 #4: surface the (possibly capped) spending basis so the card reconciles.
  const enteredMonthly =
    (state.essentialExpensesMonthly ?? 0) +
    (state.discretionaryExpensesMonthly ?? 0) +
    (Array.isArray(state.customCategories)
      ? state.customCategories.reduce((a, c) => a + (c.monthlyAmount ?? 0), 0)
      : 0);
  const sustainableMonthly = result.colMultiplier > 0 ? result.monthlyRetirementSpending / result.colMultiplier : result.monthlyRetirementSpending;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
      {/* Bento Tile 1: Featured Large Tile - Success Confidence Score (5 Cols on xl) */}
      <div className="xl:col-span-4 2xl:col-span-4 glass-panel p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between border-blue-500/30 shadow-glow">
        <div>
          <div className="flex justify-between items-start mb-3 gap-2">
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" /> Success Confidence Score
              <InfoTip term="successRate" />
            </span>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border shrink-0 ${statusClasses}`}>
              {statusLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight dark:text-white text-slate-900">{successRate}%</span>
            <span className="text-xs dark:text-slate-400 text-slate-500 font-medium">{modeLabel} Confidence</span>
          </div>
          <div className="text-[11px] dark:text-slate-400 text-slate-500 font-medium">
            Historical: {historicalSuccessRate ?? 0}% of start years succeeded
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
          {modeDescription}
        </p>
      </div>

      {/* Supporting Metric Bento Tiles (now 5 incl. Coast FIRE) */}
      <div className="xl:col-span-8 2xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
                  <InfoTip term="fireAge" />
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
                aria-label="Decrease target retirement age"
                onClick={() =>
                  onChange({
                    targetRetirementAge: Math.max(state.currentAge + 1, state.targetRetirementAge - 1),
                  })
                }
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Increase target retirement age"
                onClick={() =>
                  onChange({
                    targetRetirementAge: Math.min(85, state.targetRetirementAge + 1),
                  })
                }
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
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
              {projAt65 != null ? (
                <span className="text-3xl font-extrabold text-purple-400 tracking-tight">
                  {formatCurrency(projAt65 ?? 0)}
                </span>
              ) : (
                <span className="text-sm font-semibold dark:text-slate-400 text-slate-600">
                  N/A — 65 is outside the plan horizon
                </span>
              )}
            </div>
          </div>

          <p className="text-xs dark:text-slate-400 text-slate-500 border-t dark:border-slate-800/80 border-slate-200 pt-3 mt-3 leading-relaxed">
            Retirement Net Worth: <strong className="dark:text-slate-200 text-slate-800">{formatCurrency(targetRetirementNetWorth)}</strong>
            {targetRetirementNetWorth < 0 && (
              <span className="block mt-1 text-red-400">
                Plan can&apos;t fund retirement: debt at retirement exceeds the portfolio (see Yearly Schedule).
              </span>
            )}
          </p>
        </div>

        {/* Tile 2C: Monthly Retirement Budget (today's dollars) */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group">
          <div>
            <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400 shrink-0" /> Monthly Retirement Spending
              <InfoTip term="todaysDollars" />
            </span>

            <div className="my-3">
              <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
                {formatCurrency(monthlyRetirementSpending)}
              </span>
              <span className="text-xs dark:text-slate-400 text-slate-600 font-medium"> /mo</span>
              <span className="block text-[11px] font-bold text-cyan-300/80 mt-1 uppercase tracking-wide">
                Today&apos;s $
              </span>
            </div>
          </div>

          <p className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-1.5 border-t dark:border-slate-800/80 border-slate-200/80 pt-3 mt-3 leading-relaxed truncate" title={`Entered: ${formatCurrency(enteredMonthly)}/mo × ${colMultiplier} = ${formatCurrency(enteredMonthly * colMultiplier)}/mo. Sustainable: ${formatCurrency(sustainableMonthly)}/mo × ${colMultiplier} = ${formatCurrency(sustainableMonthly * colMultiplier)}/mo.`}>
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Adjusted for {targetLocationName} ({colMultiplier}x COL)</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Sustainable spending at your target success rate
          </p>
        </div>

        {/* Tile 2D: Savings Rate & Spend Rate with Inline Quick Toggles */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group">
          <div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" /> Savings Rate &amp; Spend Rate
                <InfoTip term="swr" />
              </span>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                Spend Rate: {safeWithdrawalRatePct}%
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-3">
              <span className="text-3xl font-extrabold text-emerald-400">{state.savingsRatePct ?? 0}%</span>
              <span className="text-xs dark:text-slate-400 text-slate-600 font-medium">of salary saved</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Spend Rate = retirement-year expense ÷ retirement-year net worth (4% = 25× coverage).
              Retirement spend: {formatCurrency(retirementAnnualExpense)}/yr (in retirement-year dollars).
            </p>
          </div>

          {/* Inline Quick Savings Rate Adjuster */}
          <div className="flex items-center justify-between dark:bg-slate-900/80 bg-slate-100 p-2 rounded-xl border dark:border-slate-800 border-slate-200 text-xs mt-3">
            <span className="dark:text-slate-400 text-slate-500 text-xs font-medium pl-1">Savings Rate</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease savings rate"
                onClick={() => onChange({ savingsRatePct: Math.max(VALIDATION_LIMITS.MIN_SAVINGS_RATE_PCT, state.savingsRatePct - 1) })}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Increase savings rate"
                onClick={() => onChange({ savingsRatePct: Math.min(VALIDATION_LIMITS.MAX_SAVINGS_RATE_PCT, state.savingsRatePct + 1) })}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-slate-800 bg-white hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-200 text-slate-700 font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tile 2E: Coast FIRE */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group hover:border-sky-500/40 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" /> Coast FIRE
              </span>
            </div>

            <div className="my-3">
              {coastFireAge != null ? (
                <>
                  <span className="text-3xl font-extrabold text-sky-400 tracking-tight">
                    Age {coastFireAge}
                  </span>
                  <span className="block text-[11px] dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                    Coast FIRE age — the earliest you could stop contributing and still hit FIRE by
                    your retirement age
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold dark:text-slate-400 text-slate-600 tracking-tight">
                    Not yet
                  </span>
                  <span className="block text-[11px] dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
                    The earliest you could stop contributing and still hit FIRE by your retirement age
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-xs dark:text-slate-400 text-slate-500 border-t dark:border-slate-800/80 border-slate-200 pt-3 mt-3 leading-relaxed">
            Stop saving, stay invested — the portfolio reaches your FIRE number on its own.
          </p>
        </div>

        {/* Tile 2F: Die with Zero — only when the plan is on track with money left over */}
        {dieWithZero != null && (
          <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between group hover:border-emerald-500/40 transition-colors">
            <div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-semibold dark:text-slate-300 text-slate-600 flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-emerald-500 shrink-0" /> Die with Zero
                  <InfoTip term="dieWithZero" />
                </span>
              </div>

              <div className="my-3">
                <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {formatCurrency(dieWithZero.extraAnnualToday)}
                </span>
                <span className="text-xs dark:text-slate-400 text-slate-600 font-medium"> /yr more</span>
                <span className="block text-[11px] font-bold text-emerald-300/80 mt-1 uppercase tracking-wide">
                  Today&apos;s $
                </span>
              </div>
            </div>

            <p className="text-xs dark:text-slate-400 text-slate-500 border-t dark:border-slate-800/80 border-slate-200 pt-3 mt-3 leading-relaxed">
              On track to leave <strong className="dark:text-slate-200 text-slate-800">{formatCurrency(dieWithZero.surplus)}</strong> at age {dieWithZero.horizonAge} — spendable over {dieWithZero.retiredYears} retired years. Rough estimate; spending more lowers success.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
