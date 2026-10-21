import React from 'react';
import { TrendingUp, Percent } from 'lucide-react';
import { RetirementState, RealIncomeGrowthMode } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const IncomeGrowthSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const calculatedSavingsAmount = state.useFixedContribution
    ? state.fixedAnnualContribution
    : (state.currentAnnualIncome * state.savingsRatePct) / 100;

  return (
    <AccordionWrapper
      id="income"
      title="Section C: Income & Growth Trajectory"
      subtitle="Household income, career growth rate, and tax bucket contributions"
      icon={<TrendingUp className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`$${Math.round(calculatedSavingsAmount).toLocaleString()}/yr Saved`}
    >
      <div className="space-y-4 pt-2">
        {/* Household Income */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <label className="text-xs font-semibold dark:text-slate-300 text-slate-700 block">
            Current Household Gross Annual Income
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-bold">$</span>
            <input
              type="number"
              min={0}
              step={5000}
              value={state.currentAnnualIncome}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) onChange({ currentAnnualIncome: Math.max(0, v) });
              }}
              aria-label="Current household gross annual income in dollars"
              className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm font-bold dark:text-slate-100 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Real Income Growth Trajectory Toggle */}
          <div className="pt-2 space-y-2">
            <label className="text-xs font-medium dark:text-slate-400 text-slate-600 block mb-2">
              Career Trajectory & Real Salary Growth
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'standard_2', label: '2% Standard' },
                { id: 'aggressive_5', label: '5% Aggressive' },
                { id: 'custom', label: 'Custom %' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ realIncomeGrowthMode: item.id as RealIncomeGrowthMode })}
                  className={`p-2.5 rounded-xl text-center transition-all text-xs border font-medium shadow-sm ${
                    state.realIncomeGrowthMode === item.id
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 font-semibold'
                      : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div>{item.label}</div>
                </button>
              ))}
            </div>

            {state.realIncomeGrowthMode === 'custom' && (
              <div className="mt-3 dark:bg-slate-900/60 bg-slate-100 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 space-y-2">
                <div className="flex justify-between text-xs dark:text-slate-300 text-slate-700">
                  <span>Custom Annual Real Growth</span>
                  <span className="font-bold text-blue-400">{state.customIncomeGrowthRate}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={state.customIncomeGrowthRate}
                  aria-label="Custom annual real income growth percentage"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') return;
                    const v = parseFloat(raw);
                    if (Number.isFinite(v)) onChange({ customIncomeGrowthRate: v });
                  }}
                  className="w-full cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Savings Rate & Annual Contributions */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold dark:text-slate-300 text-slate-700">Annual Savings & Contributions</label>
            <button
              type="button"
              onClick={() => onChange({ useFixedContribution: !state.useFixedContribution })}
              className="text-xs text-blue-400 hover:underline font-medium"
            >
              Switch to {state.useFixedContribution ? '% of Income' : 'Fixed $ Amount'}
            </button>
          </div>

          {!state.useFixedContribution ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs dark:text-slate-300 text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-400 shrink-0" /> Savings Rate (% of Income)
                  <InfoTip term="savingsRate" />
                </span>
                <span className="text-base font-extrabold text-emerald-400">{state.savingsRatePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={state.savingsRatePct}
                aria-label="Savings rate percentage of income"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const v = parseInt(raw);
                  if (Number.isFinite(v)) onChange({ savingsRatePct: v });
                }}
                className="w-full cursor-pointer"
              />
              <p className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">
                Saves <strong className="text-emerald-400">${Math.round(calculatedSavingsAmount).toLocaleString()}</strong> / year out of ${state.currentAnnualIncome.toLocaleString()} salary.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs dark:text-slate-400 text-slate-600 block">Fixed Annual Contribution ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={state.fixedAnnualContribution}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) onChange({ fixedAnnualContribution: Math.max(0, v) });
                  }}
                  aria-label="Fixed annual contribution in dollars"
                  className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm font-bold dark:text-slate-100 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tax Bucket Split Slider */}
          <div className="pt-2 space-y-2">
            <label className="text-xs font-medium dark:text-slate-400 text-slate-600 block">
              Contribution Split Across Tax Buckets
            </label>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                <span className="dark:text-slate-400 text-slate-600 block text-[11px]">Pre-Tax (401k)</span>
                <span className="font-bold text-blue-400 text-sm">{state.contributionSplit.preTaxPct}%</span>
              </div>
              <div className="dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                <span className="dark:text-slate-400 text-slate-600 block text-[11px]">Roth / HSA</span>
                <span className="font-bold text-emerald-400 text-sm">{state.contributionSplit.postTaxPct}%</span>
              </div>
              <div className="dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                <span className="dark:text-slate-400 text-slate-600 block text-[11px]">Taxable Brokerage</span>
                <span className="font-bold text-purple-400 text-sm">{state.contributionSplit.taxablePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccordionWrapper>
  );
};
