import React from 'react';
import { BarChart3, Flame, PieChart, Activity } from 'lucide-react';
import { RetirementState, InflationMode, ReturnMode } from '../../types/retirement';
import { HISTORICAL_PRESETS } from '../../data/historicalReturns';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const MarketInflationSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const handleStockPctChange = (newStock: number) => {
    const remaining = Math.max(0, 100 - newStock);
    const newBond = Math.round(remaining * 0.8);
    const newCash = 100 - newStock - newBond;
    onChange({ stockPct: newStock, bondPct: newBond, cashPct: newCash });
  };

  // Bonds are the driven input here: stocks stay fixed, cash absorbs the change.
  // (Mirrors handleStockPctChange but with bond as the slider — the previous
  // bug routed arrow keys through handleStockPctChange and destroyed the mix.)
  const handleBondPctChange = (newBond: number) => {
    const bounded = Math.max(0, Math.min(100 - state.stockPct, newBond));
    const newCash = 100 - state.stockPct - bounded;
    onChange({ bondPct: bounded, cashPct: newCash });
  };

  return (
    <AccordionWrapper
      id="market"
      title="Section D: Inflation & Market Assumptions"
      subtitle="Stock/Bond allocation, inflation presets, and simulation return models"
      icon={<BarChart3 className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`${state.stockPct}% Stocks / ${state.bondPct}% Bonds`}
    >
      <div className="space-y-4 pt-2">
        {/* Asset Allocation Sliders */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400 shrink-0" /> Portfolio Asset Allocation
            </h4>
            <span className="text-xs font-bold dark:text-slate-400 text-slate-600">
              Total: {state.stockPct + state.bondPct + state.cashPct}%
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-blue-400">Equities / Stocks</span>
                <span className="font-bold text-blue-400">{state.stockPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={state.stockPct}
                aria-label="Stocks allocation percentage"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const v = parseInt(raw);
                  if (Number.isFinite(v)) handleStockPctChange(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    handleStockPctChange(Math.min(100, state.stockPct + 5));
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleStockPctChange(Math.max(0, state.stockPct - 5));
                  }
                }}
                aria-valuetext={`${state.stockPct}% stocks`}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-emerald-400">Fixed Income / Bonds</span>
                <span className="font-bold text-emerald-400">{state.bondPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100 - state.stockPct}
                step={5}
                value={state.bondPct}
                aria-label="Bonds allocation percentage"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const b = parseInt(raw);
                  if (Number.isFinite(b)) handleBondPctChange(b);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    handleBondPctChange(state.bondPct + 5);
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleBondPctChange(state.bondPct - 5);
                  }
                }}
                aria-valuetext={`${state.bondPct}% bonds`}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-purple-400">Cash / Short-Term Treasury</span>
                <span className="font-bold text-purple-400">{state.cashPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100 - state.stockPct - state.bondPct}
                value={state.cashPct}
                disabled
                aria-label="Cash allocation percentage (auto-balancing remainder to 100%)"
                title="Cash allocation is auto-balanced to 100%"
                className="w-full opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Inflation & Return Modes */}
        <div className="dark:bg-slate-800/40 bg-slate-100 p-5 rounded-xl border dark:border-slate-700/50 border-slate-300/50 space-y-4">
          <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" /> Inflation Settings
            <InfoTip term="seqReplay" />
          </h4>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'fixed_3', label: 'Fixed 3.0%' },
              { id: 'custom', label: 'Custom Rate' },
              { id: 'historical_replay', label: 'Seq. Replay' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ inflationMode: item.id as InflationMode })}
                className={`p-2.5 rounded-xl text-center transition-all text-xs border font-medium shadow-sm ${
                  state.inflationMode === item.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-semibold'
                    : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Dynamic Reveal based on Inflation Mode */}
          {state.inflationMode === 'custom' && (
            <div className="space-y-2 dark:bg-slate-900/60 bg-slate-100 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 animate-fade-in">
              <div className="flex justify-between text-xs dark:text-slate-300 text-slate-700">
                <span>Custom Annual Inflation</span>
                <span className="font-bold text-amber-400">{state.customInflationRate}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.25}
                value={state.customInflationRate}
                aria-label="Custom annual inflation percentage"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const v = parseFloat(raw);
                  if (Number.isFinite(v)) onChange({ customInflationRate: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    onChange({ customInflationRate: Math.min(10, state.customInflationRate + 0.25) });
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    onChange({ customInflationRate: Math.max(1, state.customInflationRate - 0.25) });
                  }
                }}
                aria-valuetext={`${state.customInflationRate}% inflation`}
                className="w-full cursor-pointer"
              />
            </div>
          )}

          {state.inflationMode === 'historical_replay' && (
            <div className="space-y-2 dark:bg-slate-900/60 bg-slate-100 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 animate-fade-in">
              <label className="text-xs font-medium dark:text-slate-400 text-slate-600 block mb-1">
                Select Multi-Decade Historical Sequence Preset
              </label>
              <select
                value={state.historicalInflationPreset}
                onChange={(e) => onChange({ historicalInflationPreset: e.target.value })}
                className="w-full bg-slate-950 border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:border-amber-500 focus:outline-none transition-colors"
              >
                {HISTORICAL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.yearsRange})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Return Mode Selection */}
          <div className="pt-2 space-y-2">
            <h4 className="text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400 shrink-0" /> Return Simulation Mode
              <InfoTip term="monteCarlo" />
            <InfoTip term="histReal" />
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'deterministic', label: 'Deterministic' },
                { id: 'historical_real', label: 'Hist. Real' },
                { id: 'monte_carlo', label: 'Monte Carlo' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ returnMode: m.id as ReturnMode })}
                  className={`p-2.5 rounded-xl text-center transition-all text-xs border font-medium shadow-sm ${
                    state.returnMode === m.id
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 font-semibold'
                      : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {state.returnMode === 'historical_real' && (
            <p className="text-[11px] text-slate-500 leading-relaxed animate-fade-in">
              Hist. Real replays both the returns <em>and</em> the inflation of the selected
              &ldquo;Hist. Replay&rdquo; preset above — real returns follow the same historical
              year-by-year sequence.
              <InfoTip term="sequenceRisk" />
            </p>
          )}
        </div>
      </div>
    </AccordionWrapper>
  );
};
