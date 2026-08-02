import React from 'react';
import { ShieldCheck, Target, DollarSign, Flame, Award, MapPin } from 'lucide-react';
import { SimulationResult } from '../../types/retirement';

interface Props {
  result: SimulationResult;
}

export const SummaryCards: React.FC<Props> = ({ result }) => {
  const {
    successRate,
    targetRetirementNetWorth,
    finalNetWorthAge90,
    fireAgeAchievable,
    safeWithdrawalRatePct,
    monthlyRetirementSpending,
    targetLocationName,
    colMultiplier,
  } = result;

  const getSuccessStatus = (rate: number) => {
    if (rate >= 85) return { label: 'Very Strong', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
    if (rate >= 70) return { label: 'On Track', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' };
    if (rate >= 50) return { label: 'Moderate Risk', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
    return { label: 'High Risk', color: 'text-red-400 border-red-500/40 bg-red-500/10' };
  };

  const status = getSuccessStatus(successRate);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Monte Carlo Success Rate */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Monte Carlo Success Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-100">{successRate}%</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Based on 500 simulated market return & inflation trajectories.
        </p>
      </div>

      {/* Target Retirement Net Worth */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Target Retirement Net Worth
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-emerald-400">
                ${Math.round(targetRetirementNetWorth).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-emerald-400" /> Projected at age 90: ${Math.round(finalNetWorthAge90).toLocaleString()}
        </p>
      </div>

      {/* Monthly Retirement Spending */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Monthly Retirement Budget
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-purple-400">
                ${Math.round(monthlyRetirementSpending).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/mo</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-purple-400" /> Adjusted for {targetLocationName} ({colMultiplier}x COL)
        </p>
      </div>

      {/* FIRE Readiness / Safe Withdrawal Rate */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Safe Withdrawal Rate (SWR)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-400">{safeWithdrawalRatePct}%</span>
              {fireAgeAchievable && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  FIRE Age {fireAgeAchievable}
                </span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          {safeWithdrawalRatePct <= 4.0
            ? 'Complies with standard Trinity Study 4% withdrawal rule.'
            : 'Above 4.0% SWR: requires cautious decumulation.'}
        </p>
      </div>
    </div>
  );
};
