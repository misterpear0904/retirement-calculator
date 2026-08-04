import React from 'react';
import { TrendingUp, Percent, DollarSign } from 'lucide-react';
import { RetirementState, RealIncomeGrowthMode } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';

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
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <label className="text-xs font-semibold text-slate-300 block">
            Current Household Gross Annual Income
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-bold">$</span>
            <input
              type="number"
              min={0}
              step={5000}
              value={state.currentAnnualIncome}
              onChange={(e) => onChange({ currentAnnualIncome: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Real Income Growth Trajectory Toggle */}
          <div className="pt-2 space-y-2">
            <label className="text-xs font-medium text-slate-400 block mb-2">
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
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div>{item.label}</div>
                </button>
              ))}
            </div>

            {state.realIncomeGrowthMode === 'custom' && (
              <div className="mt-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Custom Annual Real Growth</span>
                  <span className="font-bold text-blue-400">{state.customIncomeGrowthRate}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={state.customIncomeGrowthRate}
                  onChange={(e) => onChange({ customIncomeGrowthRate: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Savings Rate & Annual Contributions */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300">Annual Savings & Contributions</label>
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
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-400 shrink-0" /> Savings Rate (% of Income)
                </span>
                <span className="text-base font-extrabold text-emerald-400">{state.savingsRatePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={75}
                value={state.savingsRatePct}
                onChange={(e) => onChange({ savingsRatePct: parseInt(e.target.value) })}
                className="w-full cursor-pointer"
              />
              <p className="text-xs text-slate-400 leading-relaxed">
                Saves <strong className="text-emerald-400">${Math.round(calculatedSavingsAmount).toLocaleString()}</strong> / year out of ${state.currentAnnualIncome.toLocaleString()} salary.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Fixed Annual Contribution ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={state.fixedAnnualContribution}
                  onChange={(e) => onChange({ fixedAnnualContribution: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tax Bucket Split Slider */}
          <div className="pt-2 space-y-2">
            <label className="text-xs font-medium text-slate-400 block">
              Contribution Split Across Tax Buckets
            </label>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px]">Pre-Tax (401k)</span>
                <span className="font-bold text-blue-400 text-sm">{state.contributionSplit.preTaxPct}%</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px]">Roth / HSA</span>
                <span className="font-bold text-emerald-400 text-sm">{state.contributionSplit.postTaxPct}%</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px]">Taxable Brokerage</span>
                <span className="font-bold text-purple-400 text-sm">{state.contributionSplit.taxablePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccordionWrapper>
  );
};
