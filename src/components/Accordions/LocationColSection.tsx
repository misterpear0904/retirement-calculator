import React from 'react';
import { MapPin, ShieldCheck, Landmark, SlidersHorizontal } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import { LOCATION_PRESETS } from '../../data/colData';
import { AccordionWrapper } from './AccordionWrapper';

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
  const selectedLocation =
    LOCATION_PRESETS.find((l) => l.id === state.targetLocationId) || LOCATION_PRESETS[0];

  const colDelta = selectedLocation.colIndex - 100;

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
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Select Destination</label>
              <select
                value={state.targetLocationId}
                onChange={(e) => onChange({ targetLocationId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:border-red-500 focus:outline-none cursor-pointer"
              >
                {LOCATION_PRESETS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.flagEmoji} {loc.name} — {loc.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-center text-xs space-y-1.5">
              <span className="text-slate-200 font-medium leading-relaxed">{selectedLocation.description}</span>
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
            </div>

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
