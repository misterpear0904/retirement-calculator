import React from 'react';
import { Calendar, User, Clock, Users } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import { AccordionWrapper } from './AccordionWrapper';
import { InfoTip } from '../InfoTip';

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
      <div className="space-y-4 pt-2">
        {/* Current Age */}
        <div className="space-y-3 bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" /> Current Age
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
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-0.5">
            <span>18 yrs</span>
            <span>50 yrs</span>
            <span>80 yrs</span>
          </div>
        </div>

        {/* Target Retirement Age */}
        <div className="space-y-3 bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" /> Target Retirement Age
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
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-0.5">
            <span>{state.currentAge + 1} yrs</span>
            <span>65 yrs</span>
            <span>85 yrs</span>
          </div>
        </div>

        {/* Life Expectancy */}
        <div className="space-y-3 bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/50">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400 shrink-0" /> Life Expectancy
            </span>
            <span className="text-sm font-bold text-purple-400">{state.lifeExpectancy} yrs</span>
          </div>
          <input
            type="range"
            min={Math.max(60, state.targetRetirementAge + 1)}
            max={110}
            value={state.lifeExpectancy}
            onChange={(e) => onChange({ lifeExpectancy: parseInt(e.target.value) })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-0.5">
            <span>{state.targetRetirementAge + 1} yrs</span>
            <span>90 yrs</span>
            <span>110 yrs</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-slate-300 mt-3 leading-relaxed">
        <div>
          Accumulation Window: <strong className="text-blue-400">{yearsToRetire} years</strong> (Age {state.currentAge} → {state.targetRetirementAge})
        </div>
        <div>
          Decumulation Horizon: <strong className="text-emerald-400">{yearsInRetirement} years</strong> (Age {state.targetRetirementAge} → {state.lifeExpectancy})
        </div>
      </div>

      {/* Partner / household */}
      <div className="bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/50 space-y-4 mt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-400 shrink-0" /> Partner / Household
            <InfoTip term="survivorBenefit" />
          </h4>
          <button
            type="button"
            role="switch"
            aria-checked={state.hasPartner && state.partner.enabled}
            onClick={() => {
              const next = !(state.hasPartner && state.partner.enabled);
              onChange({
                hasPartner: next,
                partner: { ...state.partner, enabled: next },
                ...(next ? { taxFilingStatus: 'joint' as const } : {}),
              });
            }}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              state.hasPartner && state.partner.enabled ? 'bg-pink-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                state.hasPartner && state.partner.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {state.hasPartner && state.partner.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Partner&apos;s Current Age</label>
              <input
                type="number"
                min={18}
                max={100}
                value={state.partner.currentAge}
                onChange={(e) =>
                  onChange({ partner: { ...state.partner, currentAge: parseInt(e.target.value) || 32 } })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Partner&apos;s Annual Income ($)</label>
              <input
                type="number"
                step={1000}
                value={state.partner.annualIncome}
                onChange={(e) =>
                  onChange({ partner: { ...state.partner, annualIncome: parseFloat(e.target.value) || 0 } })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Partner&apos;s Life Expectancy</label>
              <input
                type="number"
                min={30}
                max={110}
                value={state.partner.lifeExpectancy}
                onChange={(e) =>
                  onChange({ partner: { ...state.partner, lifeExpectancy: parseInt(e.target.value) || 90 } })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Partner&apos;s SS at 67 ($/mo)</label>
              <input
                type="number"
                step={100}
                value={state.partner.ssMonthlyAt67}
                onChange={(e) =>
                  onChange({ partner: { ...state.partner, ssMonthlyAt67: parseFloat(e.target.value) || 0 } })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-100 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Partner&apos;s SS Claiming Age</span>
                <span className="font-bold text-pink-400">Age {state.partner.ssStartAge}</span>
              </div>
              <input
                type="range"
                min={62}
                max={70}
                value={state.partner.ssStartAge}
                onChange={(e) =>
                  onChange({ partner: { ...state.partner, ssStartAge: parseInt(e.target.value) } })
                }
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        )}
        {!state.hasPartner && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Model a second person: combined income and savings, joint tax brackets, both Social Security checks
            with automatic survivor benefit, and a horizon covering whoever lives longest.
          </p>
        )}
      </div>
    </AccordionWrapper>
  );
};
