import React, { useState } from 'react';
import { Receipt, ArrowLeftRight, PiggyBank, Scale } from 'lucide-react';
import { RetirementState, WithdrawalStrategy, TaxFilingStatus, SpendingStrategy } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';
import { runRetirementSimulation } from '../../utils/calculatorEngine';
import { bracketFill, STANDARD_DEDUCTION } from '../../utils/taxEngine';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const TaxStrategySection: React.FC<Props> = ({ state, onChange, isOpen, onToggle }) => {
  const [exploring, setExploring] = useState(false);
  const [explorer, setExplorer] = useState<{
    withRate: number;
    withoutRate: number;
    withTaxes: number;
    withoutTaxes: number;
    converted: number;
  } | null>(null);

  const runExplorer = () => {
    setExploring(true);
    // Defer so the loading state paints before the blocking compute.
    setTimeout(() => {
      try {
        const withRoth = runRetirementSimulation(state, { trials: 300 });
        const withoutRoth = runRetirementSimulation(
          { ...state, useRothConversions: false },
          { trials: 300 }
        );
        setExplorer({
          withRate: withRoth.successRate,
          withoutRate: withoutRoth.successRate,
          withTaxes: withRoth.lifetimeTaxesPaid,
          withoutTaxes: withoutRoth.lifetimeTaxesPaid,
          converted: withRoth.lifetimeRothConverted,
        });
      } finally {
        setExploring(false);
      }
    }, 30);
  };

  return (
    <AccordionWrapper
      id="tax"
      title="Section H: Tax Strategy & Decumulation"
      subtitle="Filing status, withdrawal order, Roth conversions, and automatic RMDs"
      icon={<Receipt className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={state.useRothConversions ? 'Roth on' : state.withdrawalStrategy.replace('_', ' ')}
    >
      <div className="space-y-5 pt-2">
        {/* Filing status + withdrawal order */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">
                Tax Filing Status
                <InfoTip term="brackets" />
              </span>
              <div className="flex gap-2">
                {(['single', 'joint'] as TaxFilingStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ taxFilingStatus: s })}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      (state.hasPartner && state.partner.enabled ? 'joint' : state.taxFilingStatus) === s
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'dark:bg-slate-900 bg-white dark:text-slate-400 text-slate-600 dark:border-slate-800 border-slate-200 hover:text-slate-200'
                    }`}
                  >
                    {s === 'single' ? 'Single' : 'Married Joint'}
                  </button>
                ))}
              </div>
              {state.hasPartner && state.partner.enabled && (
                <p className="text-[11px] text-slate-500 mt-1">Joint brackets apply automatically with a partner.</p>
              )}
            </div>
            <div>
              <span className="text-xs font-medium dark:text-slate-300 text-slate-700 block mb-1">
                Withdrawal Strategy
                <InfoTip term="guardrails" />
              </span>
              <select
                value={state.withdrawalStrategy}
                onChange={(e) => onChange({ withdrawalStrategy: e.target.value as WithdrawalStrategy })}
                className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold dark:text-slate-100 text-slate-900 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="fixed_order">Tax-efficient order (cash → taxable → pre-tax → Roth)</option>
                <option value="proportional">Proportional across accounts</option>
                <option value="guardrails">Guardrails (cut spending after down years)</option>
              </select>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-300 block mb-1">
              Retirement Spending Strategy
            </span>
            <select
              value={state.spendingStrategy ?? 'fixed_real'}
              onChange={(e) => onChange({ spendingStrategy: e.target.value as SpendingStrategy })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="fixed_real">Fixed real spending (inflation-adjusted)</option>
              <option value="vpw">Variable Percentage Withdrawal (VPW)</option>
              <option value="guyton_klinger">Guyton-Klinger guardrails</option>
              <option value="bernicke">Bernicke declining spending</option>
            </select>
          </div>

          {state.withdrawalStrategy === 'guardrails' && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex justify-between text-xs dark:text-slate-400 text-slate-600">
                <span>Spending cut after a down year</span>
                <span className="font-bold text-amber-400">{state.guardrailCutPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={state.guardrailCutPct}
                aria-label="Spending cut after a down year"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const v = parseInt(raw);
                  if (Number.isFinite(v)) onChange({ guardrailCutPct: v });
                }}
                className="w-full cursor-pointer min-h-[44px]"
              />
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
            <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5 dark:text-slate-400 text-slate-600" />
            <span>
              Federal brackets (2025) + capital gains + state tax apply to every withdrawal automatically.
              RMDs start at 75. <InfoTip term="rmd" />
            </span>
          </p>
        </div>

        {/* Roth conversions */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-400 shrink-0" /> Roth Conversions
              <InfoTip term="rothConversion" />
            </h4>
            <button
              type="button"
              role="switch"
              aria-checked={state.useRothConversions}
              onClick={() => onChange({ useRothConversions: !state.useRothConversions })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                state.useRothConversions ? 'bg-purple-500' : 'dark:bg-slate-700 bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  state.useRothConversions ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {state.useRothConversions && (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Bracket-fill viz: current-year federal brackets vs taxable income headroom */}
              {(() => {
                const filing = state.hasPartner && state.partner.enabled ? 'joint' : state.taxFilingStatus;
                const taxable = Math.max(0, state.currentAnnualIncome - STANDARD_DEDUCTION[filing]);
                const fills = bracketFill(taxable, filing);
                const total = fills.reduce((a, f) => a + (f.cap === Infinity ? f.filled : f.cap - f.floor), 0);
                const active = fills.find((f) => f.filled < (f.cap === Infinity ? f.filled + 1 : f.cap - f.floor));
                return (
                  <div className="dark:bg-slate-900/70 bg-white/90 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Federal bracket fill (current income)
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700" role="img"
                      aria-label={`Taxable income about $${Math.round(taxable).toLocaleString()}, marginal rate ${(active ? active.rate * 100 : 37).toFixed(0)} percent`}>
                      {fills.map((f, i) => {
                        const width = f.cap === Infinity ? 8 : ((f.cap - f.floor) / total) * 100;
                        return (
                          <div
                            key={i}
                            style={{ width: `${f.cap === Infinity ? 8 : width}%` }}
                            className={f.filled > 0 ? 'bg-purple-500/80' : 'bg-transparent'}
                            title={`${(f.rate * 100).toFixed(0)}% bracket: $${f.floor.toLocaleString()}–${f.cap === Infinity ? '∞' : `$${f.cap.toLocaleString()}`}`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Taxable ≈ ${Math.round(taxable).toLocaleString()} → marginal{' '}
                      {(active ? active.rate * 100 : 37).toFixed(0)}%. Converting ${Math.round(state.rothConversionAnnual).toLocaleString()}/yr
                      {' '}fills {active ? `the ${(active.rate * 100).toFixed(0)}% bracket` : 'the top bracket'} — compare lifetime tax above.
                    </p>
                  </div>
                );
              })()}
              <div>
                <label className="text-[11px] dark:text-slate-400 text-slate-600 block mb-1">Convert per year ($)</label>
                <input
                  type="number"
                  step={1000}
                  value={state.rothConversionAnnual}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) onChange({ rothConversionAnnual: Math.max(0, v) });
                  }}
                  aria-label="Roth conversion amount per year in dollars"
                  className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 font-bold dark:text-slate-100 text-slate-900 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between dark:text-slate-400 text-slate-600 mb-1">
                    <span>From age</span>
                    <span className="font-bold text-purple-400">{state.rothConversionStartAge}</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={85}
                    value={state.rothConversionStartAge}
                    aria-label="Roth conversions from age"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return;
                      const v = parseInt(raw);
                      if (!Number.isFinite(v)) return;
                      onChange({
                        rothConversionStartAge: v,
                        rothConversionEndAge: Math.max(v, state.rothConversionEndAge),
                      });
                    }}
                    className="w-full cursor-pointer min-h-[44px]"
                  />
                </div>
                <div>
                  <div className="flex justify-between dark:text-slate-400 text-slate-600 mb-1">
                    <span>Through age</span>
                    <span className="font-bold text-purple-400">{state.rothConversionEndAge}</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={85}
                    value={state.rothConversionEndAge}
                    aria-label="Roth conversions through age"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return;
                      const v = parseInt(raw);
                      if (!Number.isFinite(v)) return;
                      onChange({
                        rothConversionEndAge: v,
                        rothConversionStartAge: Math.min(v, state.rothConversionStartAge),
                      });
                    }}
                    className="w-full cursor-pointer min-h-[44px]"
                  />
                </div>
              </div>

              <div className="dark:bg-slate-900/70 bg-white/90 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 space-y-2.5">
                <button
                  type="button"
                  onClick={runExplorer}
                  disabled={exploring}
                  className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  <PiggyBank className="w-4 h-4" />
                  {exploring ? 'Running comparison…' : 'Compare with vs without conversions'}
                </button>
                {explorer && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="dark:bg-slate-800/60 bg-slate-200/60 rounded-lg p-2.5 border dark:border-slate-700/60 border-slate-300/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Success</div>
                      <div className="font-extrabold dark:text-slate-100 text-slate-900">
                        {explorer.withoutRate}% → <span className="text-emerald-400">{explorer.withRate}%</span>
                      </div>
                    </div>
                    <div className="dark:bg-slate-800/60 bg-slate-200/60 rounded-lg p-2.5 border dark:border-slate-700/60 border-slate-300/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Lifetime tax</div>
                      <div className="font-extrabold dark:text-slate-100 text-slate-900">
                        ${(explorer.withoutTaxes / 1000).toFixed(0)}k → ${(explorer.withTaxes / 1000).toFixed(0)}k
                      </div>
                    </div>
                    <div className="dark:bg-slate-800/60 bg-slate-200/60 rounded-lg p-2.5 border dark:border-slate-700/60 border-slate-300/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Converted</div>
                      <div className="font-extrabold text-purple-300">
                        ${(explorer.converted / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AccordionWrapper>
  );
};
