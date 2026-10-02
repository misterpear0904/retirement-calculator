import React, { useState } from 'react';
import { MapPin, ShieldCheck, Landmark, SlidersHorizontal, Sparkles } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import { resolveLocation } from '../../data/cityLocations';
import { AccordionWrapper } from './AccordionWrapper';
import { LocationMap } from './LocationMap';
import { InfoTip } from '../InfoTip';
import { optimizeHousehold } from '../../utils/ssOptimizer';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const LocationColSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const selectedLocation = resolveLocation(state.targetLocationId);

  const colDelta = selectedLocation.colIndex - 100;

  const [showOptimizer, setShowOptimizer] = useState(false);
  const optimization = showOptimizer ? optimizeHousehold(state) : null;

  return (
    <AccordionWrapper
      id="location"
      title="Section G: Retirement Location & Cost of Living (COL)"
      subtitle="Geographic relocation multipliers and guaranteed income (Social Security & Pension)"
      icon={<MapPin className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`${selectedLocation.flagEmoji} ${selectedLocation.name}`}
    >
      <div className="space-y-5 pt-2">
        {/* Target Location Selector */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" /> Target Retirement Destination
            </h4>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                colDelta < 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : colDelta > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              COL Index: {selectedLocation.colIndex} ({colDelta > 0 ? `+${colDelta}%` : `${colDelta}%`} vs US Baseline)
              <InfoTip term="col" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span id="destination-map-label" className="text-[11px] text-slate-400 block mb-1">
                Click anywhere on the map — snaps to the nearest city of 1M+ people
              </span>
              <LocationMap
                selectedId={state.targetLocationId}
                onSelect={(id) => onChange({ targetLocationId: id })}
              />
            </div>

            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-center text-xs space-y-1.5">
              <span className="text-slate-200 font-medium leading-relaxed">
                {selectedLocation.description}
                {selectedLocation.isEstimate && (
                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 align-middle">
                    Estimated country-level data
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                <span>Housing: <strong className="text-slate-200">{selectedLocation.housingIndex}%</strong></span>
                <span>Healthcare: <strong className="text-slate-200">{selectedLocation.healthcareIndex}%</strong></span>
                <span>State/Local Tax: <strong className="text-slate-200">{selectedLocation.stateTaxPct}%</strong></span>
              </div>
            </div>
          </div>

          {/* COL Percentile Adjustment Slider */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/40 space-y-2.5 mt-1">
            <div className="flex justify-between items-center">
              <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Local COL Percentile Adjustment
              </h4>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                state.colAdjustmentPct === 0
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : state.colAdjustmentPct > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {state.colAdjustmentPct > 0 ? '+' : ''}{state.colAdjustmentPct}% adjustment
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fine-tune your cost of living within {selectedLocation.name}. Slide left for more affordable neighborhoods, right for premium areas.
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Adjustment</span>
                <span className="font-bold text-cyan-400">
                  Effective COL: {Math.round(selectedLocation.colIndex * (1 + state.colAdjustmentPct / 100))}
                  <span className="text-slate-500 font-normal ml-1">(base: {selectedLocation.colIndex})</span>
                </span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={state.colAdjustmentPct}
                onChange={(e) => onChange({ colAdjustmentPct: parseInt(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    onChange({ colAdjustmentPct: Math.min(50, state.colAdjustmentPct + 5) });
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    onChange({ colAdjustmentPct: Math.max(-50, state.colAdjustmentPct - 5) });
                  }
                }}
                aria-valuetext={`${state.colAdjustmentPct > 0 ? '+' : ''}${state.colAdjustmentPct}% adjustment`}
                className="w-full cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>−50% (Budget)</span>
                <span>Baseline</span>
                <span>+50% (Premium)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guaranteed Retirement Income (Social Security & Pension) */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 space-y-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-400 shrink-0" /> Social Security & Guaranteed Pension Income
          </h4>

          <div className="space-y-4 text-xs">
            {/* Social Security */}
            <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> Social Security Benefit
                <InfoTip term="ssClaim" />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Estimated Monthly Benefit at Age 67 ($)</label>
                <input
                  type="number"
                  step={100}
                  value={state.socialSecurityMonthlyAt67}
                  onChange={(e) => onChange({ socialSecurityMonthlyAt67: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Claiming Start Age</span>
                  <span className="font-bold text-emerald-400">Age {state.socialSecurityStartAge}</span>
                </div>
                <input
                  type="range"
                  min={62}
                  max={70}
                  value={state.socialSecurityStartAge}
                  onChange={(e) => onChange({ socialSecurityStartAge: parseInt(e.target.value) })}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                  <span>62 (Reduced 30%)</span>
                  <span>67 (Full)</span>
                  <span>70 (Bonus 24%)</span>
                </div>
              </div>

              {/* Claiming-age optimizer */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptimizer((v) => !v)}
                  className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  {showOptimizer ? 'Hide claiming optimizer' : 'Optimize claiming ages'}
                </button>
              </div>
            </div>

            {showOptimizer && optimization && (
              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-emerald-500/30 animate-fade-in">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Best household total:{' '}
                  <strong className="text-emerald-400">
                    ${(optimization.optimum.householdLifetimeTotal / 1000).toFixed(0)}k lifetime
                  </strong>{' '}
                  by claiming at <strong>age {optimization.optimum.primaryAge}</strong>
                  {optimization.optimum.spouseAge != null &&
                    ` (partner at ${optimization.optimum.spouseAge})`}
                  .
                </p>
                <div className="grid grid-cols-9 gap-1 text-center">
                  {optimization.primaryRows.map((r) => (
                    <div
                      key={r.claimAge}
                      className={`rounded-lg py-1.5 px-0.5 border ${
                        r.isBest
                          ? 'bg-emerald-500/20 border-emerald-500/50'
                          : r.isCurrent
                            ? 'bg-blue-500/15 border-blue-500/40'
                            : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                      title={`Age ${r.claimAge}: $${r.monthlyBenefit.toLocaleString()}/mo, $${(r.lifetimeTotal / 1000).toFixed(0)}k lifetime`}
                    >
                      <div className={`text-[11px] font-extrabold ${r.isBest ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {r.claimAge}
                      </div>
                      <div className="text-[9px] text-slate-500">${(r.lifetimeTotal / 1000).toFixed(0)}k</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        socialSecurityStartAge: optimization.optimum.primaryAge,
                        ...(optimization.optimum.spouseAge != null
                          ? { partner: { ...state.partner, ssStartAge: optimization.optimum.spouseAge as number } }
                          : {}),
                      });
                      setShowOptimizer(false);
                    }}
                    className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
                  >
                    Apply age{optimization.optimum.spouseAge != null ? 's' : ''} to plan
                  </button>
                  <span className="text-[10px] text-slate-500 leading-relaxed">
                    Nominal lifetime totals (no discounting); survivor top-up modeled separately in the plan.
                  </span>
                </div>
              </div>
            )}

            {/* Pension */}
            <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
                <Landmark className="w-4 h-4 text-purple-400 shrink-0" /> Corporate / State Pension
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Estimated Monthly Pension ($)</label>
                <input
                  type="number"
                  step={100}
                  value={state.pensionMonthly}
                  onChange={(e) => onChange({ pensionMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pension Start Age</span>
                  <span className="font-bold text-purple-400">Age {state.pensionStartAge}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={75}
                  value={state.pensionStartAge}
                  onChange={(e) => onChange({ pensionStartAge: parseInt(e.target.value) })}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccordionWrapper>
  );
};
