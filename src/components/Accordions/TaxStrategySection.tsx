import React, { useState } from 'react';
import { Receipt, ArrowLeftRight, PiggyBank, Scale } from 'lucide-react';
import { RetirementState, WithdrawalStrategy, TaxFilingStatus } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';
import { runRetirementSimulation } from '../../utils/calculatorEngine';

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
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-xs font-medium text-slate-300 block mb-1">
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
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
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
              <span className="text-xs font-medium text-slate-300 block mb-1">
                Withdrawal Strategy
                <InfoTip term="guardrails" />
              </span>
              <select
                value={state.withdrawalStrategy}
                onChange={(e) => onChange({ withdrawalStrategy: e.target.value as WithdrawalStrategy })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="fixed_order">Tax-efficient order (cash → taxable → pre-tax → Roth)</option>
                <option value="proportional">Proportional across accounts</option>
                <option value="guardrails">Guardrails (cut spending after down years)</option>
              </select>
            </div>
          </div>

          {state.withdrawalStrategy === 'guardrails' && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Spending cut after a down year</span>
                <span className="font-bold text-amber-400">{state.guardrailCutPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={state.guardrailCutPct}
                onChange={(e) => onChange({ guardrailCutPct: parseInt(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
            <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>
              Federal brackets (2025) + capital gains + state tax apply to every withdrawal automatically.
              RMDs start at 75. <InfoTip term="rmd" />
            </span>
          </p>
        </div>

        {/* Roth conversions */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-400 shrink-0" /> Roth Conversions
              <InfoTip term="rothConversion" />
            </h4>
            <button
              type="button"
              role="switch"
              aria-checked={state.useRothConversions}
              onClick={() => onChange({ useRothConversions: !state.useRothConversions })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                state.useRothConversions ? 'bg-purple-500' : 'bg-slate-700'
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
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Convert per year ($)</label>
                <input
                  type="number"
                  step={1000}
                  value={state.rothConversionAnnual}
                  onChange={(e) => onChange({ rothConversionAnnual: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>From age</span>
                    <span className="font-bold text-purple-400">{state.rothConversionStartAge}</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={85}
                    value={state.rothConversionStartAge}
                    onChange={(e) =>
                      onChange({
                        rothConversionStartAge: parseInt(e.target.value),
                        rothConversionEndAge: Math.max(parseInt(e.target.value), state.rothConversionEndAge),
                      })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Through age</span>
                    <span className="font-bold text-purple-400">{state.rothConversionEndAge}</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={85}
                    value={state.rothConversionEndAge}
                    onChange={(e) =>
                      onChange({
                        rothConversionEndAge: parseInt(e.target.value),
                        rothConversionStartAge: Math.min(parseInt(e.target.value), state.rothConversionStartAge),
                      })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
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
                    <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Success</div>
                      <div className="font-extrabold text-slate-100">
                        {explorer.withoutRate}% → <span className="text-emerald-400">{explorer.withRate}%</span>
                      </div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Lifetime tax</div>
                      <div className="font-extrabold text-slate-100">
                        ${(explorer.withoutTaxes / 1000).toFixed(0)}k → ${(explorer.withTaxes / 1000).toFixed(0)}k
                      </div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/60">
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
