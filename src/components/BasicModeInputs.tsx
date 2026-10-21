import React, { useMemo, useState } from 'react';
import { Wallet, Briefcase, PiggyBank, TrendingUp, Calendar, User, Sparkles } from 'lucide-react';
import { RetirementState } from '../types/retirement';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  onSwitchToAdvanced: () => void;
}

function distributeTotalSavings(
  state: RetirementState,
  newTotal: number
): Pick<RetirementState, 'liquidCash' | 'taxableInvestments' | 'preTax401k' | 'postTaxRothHsa'> {
  const total = Math.max(0, Math.round(newTotal));
  const oldTotal =
    state.liquidCash + state.taxableInvestments + state.preTax401k + state.postTaxRothHsa;
  if (oldTotal > 0) {
    const scale = total / oldTotal;
    return {
      liquidCash: Math.round(state.liquidCash * scale),
      taxableInvestments: Math.round(state.taxableInvestments * scale),
      preTax401k: Math.round(state.preTax401k * scale),
      postTaxRothHsa: Math.max(
        0,
        total -
          Math.round(state.liquidCash * scale) -
          Math.round(state.taxableInvestments * scale) -
          Math.round(state.preTax401k * scale)
      ),
    };
  }
  // No existing savings: use a sensible default split.
  return {
    liquidCash: Math.round(total * 0.1),
    taxableInvestments: Math.round(total * 0.3),
    preTax401k: Math.round(total * 0.5),
    postTaxRothHsa: Math.max(
      0,
      total - Math.round(total * 0.1) - Math.round(total * 0.3) - Math.round(total * 0.5)
    ),
  };
}

function mixLabel(stockPct: number): string {
  if (stockPct < 40) return 'Conservative';
  if (stockPct <= 75) return 'Moderate';
  return 'Aggressive';
}

export const BasicModeInputs: React.FC<Props> = ({ state, onChange, onSwitchToAdvanced }) => {
  const totalSavings = useMemo(
    () => state.liquidCash + state.taxableInvestments + state.preTax401k + state.postTaxRothHsa,
    [state.liquidCash, state.taxableInvestments, state.preTax401k, state.postTaxRothHsa]
  );

  const monthlySpending = useMemo(
    () => state.essentialExpensesMonthly + state.discretionaryExpensesMonthly,
    [state.essentialExpensesMonthly, state.discretionaryExpensesMonthly]
  );

  const yearsToRetire = Math.max(0, state.targetRetirementAge - state.currentAge);

  const [moneyText, setMoneyText] = useState<Record<string, string>>({});
  const [moneyError, setMoneyError] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border dark:bg-slate-900/90 bg-white/95 dark:border-blue-500/40 border-blue-500/50 shadow-glow overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold dark:text-slate-100 text-slate-800">
              Basic Mode — Essentials
            </h3>
            <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed" aria-label={`${yearsToRetire} years to retire · 7 high-level inputs · details use sensible defaults`}>
              {yearsToRetire} yrs to retire · 7 high-level inputs · details use sensible defaults
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t dark:border-slate-800/60 border-slate-200 space-y-4">
          {/* 1. Current Age */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400 shrink-0" />
                <label htmlFor="basic-age">Current age</label>
              </span>
              <span className="text-sm font-bold text-blue-400">{state.currentAge} yrs</span>
            </div>
            <input
              id="basic-age"
              type="range"
              min={18}
              max={80}
              value={state.currentAge}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                const val = parseInt(raw);
                if (!Number.isFinite(val)) return;
                onChange({
                  currentAge: val,
                  targetRetirementAge: Math.max(val + 1, state.targetRetirementAge),
                });
              }}
              className="w-full cursor-pointer min-h-[44px]"
            />
          </div>

          {/* 2. Target retirement age */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <label htmlFor="basic-retire">Retire at age</label>
              </span>
              <span className="text-sm font-bold text-emerald-400">{state.targetRetirementAge} yrs</span>
            </div>
            <input
              id="basic-retire"
              type="range"
              min={Math.max(19, state.currentAge + 1)}
              max={85}
              value={state.targetRetirementAge}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                const val = parseInt(raw);
                if (!Number.isFinite(val)) return;
                onChange({
                  targetRetirementAge: val,
                  lifeExpectancy: Math.max(val + 5, state.lifeExpectancy),
                });
              }}
              className="w-full cursor-pointer min-h-[44px]"
            />
          </div>

          {/* 3. Life expectancy */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400 shrink-0" />
                <label htmlFor="basic-life">Plan until age</label>
              </span>
              <span className="text-sm font-bold text-purple-400">{state.lifeExpectancy} yrs</span>
            </div>
            <input
              id="basic-life"
              type="range"
              min={Math.max(60, state.targetRetirementAge + 1)}
              max={110}
              value={state.lifeExpectancy}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                const val = parseInt(raw);
                if (Number.isFinite(val)) onChange({ lifeExpectancy: val });
              }}
              className="w-full cursor-pointer min-h-[44px]"
            />
          </div>

          {/* 4. Income */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                <label htmlFor="basic-income">Annual income</label>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-600 text-sm">$</span>
              <input
                id="basic-income"
                type="text" inputMode="decimal"
                min={0}
                step={1000}
                value={moneyText['currentAnnualIncome'] ?? state.currentAnnualIncome}
                onChange={(e) => {
                  const raw = e.target.value;
                  setMoneyText((prev) => ({ ...prev, currentAnnualIncome: raw }));
                  const badInput = e.target.validity?.badInput ?? false;
                  if (raw === '' && !badInput) {
                    setMoneyError((prev) => ({ ...prev, currentAnnualIncome: false }));
                    return;
                  }
                  const v = parseFloat(raw);
                  if (!Number.isFinite(v) || v < 0) {
                    setMoneyError((prev) => ({ ...prev, currentAnnualIncome: true }));
                    return;
                  }
                  setMoneyError((prev) => ({ ...prev, currentAnnualIncome: false }));
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.currentAnnualIncome;
                    return next;
                  });
                  onChange({ currentAnnualIncome: Math.max(0, v) });
                }}
                onBlur={() => {
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.currentAnnualIncome;
                    return next;
                  });
                }}
                className={`w-full dark:bg-slate-900 bg-white border ${moneyError['currentAnnualIncome'] ? 'border-red-500' : 'dark:border-slate-700 border-slate-300'} rounded-lg pl-7 pr-3 py-2 text-sm font-bold dark:text-slate-100 text-slate-900 focus:border-blue-500 focus:outline-none`}
              />
              {moneyError['currentAnnualIncome'] && (
                <p className="text-xs text-red-400 mt-1">Enter a number 0 or greater</p>
              )}
            </div>
          </div>

          {/* 5. Savings rate */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-400 shrink-0" />
                <label htmlFor="basic-save">Save rate</label>
              </span>
              <span className="text-sm font-bold text-emerald-400">{state.savingsRatePct}%</span>
            </div>
            <input
              id="basic-save"
              type="range"
              min={0}
              max={100}
              value={state.savingsRatePct}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                const val = parseInt(raw);
                if (Number.isFinite(val)) onChange({ savingsRatePct: val, useFixedContribution: false });
              }}
              className="w-full cursor-pointer min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              ≈ ${Math.round((state.currentAnnualIncome * state.savingsRatePct) / 100).toLocaleString()}/yr saved
            </p>
          </div>

          {/* 6. Total current savings */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-400 shrink-0" />
                <label htmlFor="basic-savings">Total saved so far</label>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-600 text-sm">$</span>
              <input
                id="basic-savings"
                type="text" inputMode="decimal"
                min={0}
                step={1000}
                value={moneyText['totalSavings'] ?? totalSavings}
                onChange={(e) => {
                  const raw = e.target.value;
                  setMoneyText((prev) => ({ ...prev, totalSavings: raw }));
                  const badInput = e.target.validity?.badInput ?? false;
                  if (raw === '' && !badInput) {
                    setMoneyError((prev) => ({ ...prev, totalSavings: false }));
                    return;
                  }
                  const v = parseFloat(raw);
                  if (!Number.isFinite(v) || v < 0) {
                    setMoneyError((prev) => ({ ...prev, totalSavings: true }));
                    return;
                  }
                  setMoneyError((prev) => ({ ...prev, totalSavings: false }));
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.totalSavings;
                    return next;
                  });
                  onChange(distributeTotalSavings(state, Math.max(0, v)));
                }}
                onBlur={() => {
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.totalSavings;
                    return next;
                  });
                }}
                className={`w-full dark:bg-slate-900 bg-white border ${moneyError['totalSavings'] ? 'border-red-500' : 'dark:border-slate-700 border-slate-300'} rounded-lg pl-7 pr-3 py-2 text-sm font-bold dark:text-slate-100 text-slate-900 focus:border-cyan-500 focus:outline-none`}
              />
              {moneyError['totalSavings'] && (
                <p className="text-xs text-red-400 mt-1">Enter a number 0 or greater</p>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Split across cash, taxable, 401k & Roth automatically.</p>
          </div>

          {/* 7. Monthly spending */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
                <label htmlFor="basic-spend">Monthly spending in retirement</label>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-600 text-sm">$</span>
              <input
                id="basic-spend"
                type="text" inputMode="decimal"
                min={0}
                step={100}
                value={moneyText['monthlySpending'] ?? monthlySpending}
                onChange={(e) => {
                  const raw = e.target.value;
                  setMoneyText((prev) => ({ ...prev, monthlySpending: raw }));
                  const badInput = e.target.validity?.badInput ?? false;
                  if (raw === '' && !badInput) {
                    setMoneyError((prev) => ({ ...prev, monthlySpending: false }));
                    return;
                  }
                  const v = parseFloat(raw);
                  if (!Number.isFinite(v) || v < 0) {
                    setMoneyError((prev) => ({ ...prev, monthlySpending: true }));
                    return;
                  }
                  setMoneyError((prev) => ({ ...prev, monthlySpending: false }));
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.monthlySpending;
                    return next;
                  });
                  if (v !== monthlySpending) {
                    onChange({
                      essentialExpensesMonthly: Math.max(0, v),
                      discretionaryExpensesMonthly: 0,
                      lifestyleTier: 'moderate',
                      customCategories: [],
                    });
                  }
                }}
                onBlur={() => {
                  setMoneyText((prev) => {
                    const next = { ...prev };
                    delete next.monthlySpending;
                    return next;
                  });
                }}
                className={`w-full dark:bg-slate-900 bg-white border ${moneyError['monthlySpending'] ? 'border-red-500' : 'dark:border-slate-700 border-slate-300'} rounded-lg pl-7 pr-3 py-2 text-sm font-bold dark:text-slate-100 text-slate-900 focus:border-amber-500 focus:outline-none`}
              />
              {moneyError['monthlySpending'] && (
                <p className="text-xs text-red-400 mt-1">Enter a number 0 or greater</p>
              )}
            </div>
          </div>

          {/* 8. Investment mix */}
          <div className="space-y-2 dark:bg-slate-800/40 bg-slate-100 p-4 rounded-xl border dark:border-slate-700/50 border-slate-300/50">
            <div className="flex justify-between items-center text-xs font-medium dark:text-slate-300 text-slate-700">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
                <label htmlFor="basic-mix">Invested in stocks</label>
              </span>
              <span className="text-sm font-bold text-purple-400" aria-label={`${state.stockPct}% · ${mixLabel(state.stockPct)}`}>
                {state.stockPct}% · {mixLabel(state.stockPct)}
              </span>
            </div>
            <input
              id="basic-mix"
              type="range"
              min={0}
              max={95}
              value={state.stockPct}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return;
                const stock = parseInt(raw);
                if (!Number.isFinite(stock)) return;
                onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const stock = Math.min(95, state.stockPct + 5);
                  onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const stock = Math.max(0, state.stockPct - 5);
                  onChange({ stockPct: stock, bondPct: Math.max(0, 95 - stock), cashPct: 5 });
                }
              }}
              aria-valuetext={`${state.stockPct}% stocks`}
              className="w-full cursor-pointer min-h-[44px]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Conservative</span>
              <span>Moderate</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white/60 p-4 text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
        Housing, kids, location, inflation & tax details use sensible defaults.{' '}
        <button
          type="button"
          onClick={onSwitchToAdvanced}
          className="text-blue-400 hover:underline font-semibold"
        >
          Switch to Advanced
        </button>{' '}
        to fine-tune all 40+ inputs.
      </div>
    </div>
  );
};
