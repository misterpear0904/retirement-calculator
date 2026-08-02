import React from 'react';
import { Calendar, User, Clock } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';

interface Props {
  state: RetirementState;
  onChange: (updates: Partial<RetirementState>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DemographicsSection: React.FC<Props> = ({
  state,
  onChange,
  isOpen,
  onToggle,
}) => {
  const yearsToRetire = Math.max(0, state.targetRetirementAge - state.currentAge);
  const yearsInRetirement = Math.max(0, state.lifeExpectancy - state.targetRetirementAge);

  return (
    <AccordionWrapper
      id="demographics"
      title="Section A: Demographics & Timeline"
      subtitle="Define your current age, target retirement age, and horizon"
      icon={<User className="w-5 h-5" />}
      isOpen={isOpen}
      onToggle={onToggle}
      badgeText={`${yearsToRetire} yrs to retire`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {/* Current Age */}
        <div className="space-y-2 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Current Age
            </span>
            <span className="text-sm font-bold text-blue-400">{state.currentAge} yrs</span>
          </div>
          <input
            type="range"
            min={18}
            max={80}
            value={state.currentAge}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChange({
                currentAge: val,
                targetRetirementAge: Math.max(val + 1, state.targetRetirementAge),
              });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>18</span>
            <span>50</span>
            <span>80</span>
          </div>
        </div>

        {/* Target Retirement Age */}
        <div className="space-y-2 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Target Retirement Age
            </span>
            <span className="text-sm font-bold text-emerald-400">{state.targetRetirementAge} yrs</span>
          </div>
          <input
            type="range"
            min={Math.max(19, state.currentAge + 1)}
            max={85}
            value={state.targetRetirementAge}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChange({
                targetRetirementAge: val,
                lifeExpectancy: Math.max(val + 5, state.lifeExpectancy),
              });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{state.currentAge + 1}</span>
            <span>65</span>
            <span>85</span>
          </div>
        </div>

        {/* Life Expectancy */}
        <div className="space-y-2 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" /> Life Expectancy
            </span>
            <span className="text-sm font-bold text-purple-400">{state.lifeExpectancy} yrs</span>
          </div>
          <input
            type="range"
            min={Math.max(60, state.targetRetirementAge + 1)}
            max={110}
            value={state.lifeExpectancy}
            onChange={(e) => onChange({ lifeExpectancy: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{state.targetRetirementAge + 1}</span>
            <span>90</span>
            <span>110</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-slate-300 mt-2">
        <div>
          Accumulation Window: <strong className="text-blue-400">{yearsToRetire} years</strong> (Age {state.currentAge} → {state.targetRetirementAge})
        </div>
        <div>
          Decumulation Horizon: <strong className="text-emerald-400">{yearsInRetirement} years</strong> (Age {state.targetRetirementAge} → {state.lifeExpectancy})
        </div>
      </div>
    </AccordionWrapper>
  );
};
