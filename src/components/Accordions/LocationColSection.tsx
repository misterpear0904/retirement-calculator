import React from 'react';
import { MapPin, ShieldCheck, Landmark } from 'lucide-react';
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
      <div className="space-y-4 pt-2">
        {/* Target Location Selector */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" /> Target Retirement Destination
            </h4>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                colDelta < 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : colDelta > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              COL Index: {selectedLocation.colIndex} ({colDelta > 0 ? `+${colDelta}%` : `${colDelta}%`} vs US Baseline)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Select Destination</label>
              <select
                value={state.targetLocationId}
                onChange={(e) => onChange({ targetLocationId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:border-red-500 focus:outline-none"
              >
                {LOCATION_PRESETS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.flagEmoji} {loc.name} — {loc.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center text-xs">
              <span className="text-slate-300 font-semibold">{selectedLocation.description}</span>
              <div className="flex gap-4 mt-1 text-[11px] text-slate-400">
                <span>Housing: <strong className="text-slate-200">{selectedLocation.housingIndex}%</strong></span>
                <span>Healthcare: <strong className="text-slate-200">{selectedLocation.healthcareIndex}%</strong></span>
                <span>State/Local Tax: <strong className="text-slate-200">{selectedLocation.stateTaxPct}%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Guaranteed Retirement Income (Social Security & Pension) */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-blue-400" /> Social Security & Guaranteed Pension Income
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Social Security */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Social Security Benefit
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Estimated Monthly Benefit at Age 67 ($)</label>
                <input
                  type="number"
                  step={100}
                  value={state.socialSecurityMonthlyAt67}
                  onChange={(e) => onChange({ socialSecurityMonthlyAt67: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-bold text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Claiming Start Age</span>
                  <span className="font-bold text-emerald-400">Age {state.socialSecurityStartAge}</span>
                </div>
                <input
                  type="range"
                  min={62}
                  max={70}
                  value={state.socialSecurityStartAge}
                  onChange={(e) => onChange({ socialSecurityStartAge: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>62 (Reduced 30%)</span>
                  <span>67 (Full)</span>
                  <span>70 (Bonus 24%)</span>
                </div>
              </div>
            </div>

            {/* Pension */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Landmark className="w-4 h-4 text-purple-400" /> Corporate / State Pension
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Estimated Monthly Pension ($)</label>
                <input
                  type="number"
                  step={100}
                  value={state.pensionMonthly}
                  onChange={(e) => onChange({ pensionMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-bold text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pension Start Age</span>
                  <span className="font-bold text-purple-400">Age {state.pensionStartAge}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={75}
                  value={state.pensionStartAge}
                  onChange={(e) => onChange({ pensionStartAge: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccordionWrapper>
  );
};
