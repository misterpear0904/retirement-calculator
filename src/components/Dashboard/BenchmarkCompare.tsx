import React, { useMemo } from 'react';
import { Globe2, Info } from 'lucide-react';
import { RetirementState } from '../../types/retirement';
import {
  REGION_BENCHMARKS,
  ageAdjustedWealthMedian,
  getBandForAge,
  lognormalPercentile,
  savingsPercentile,
  multipleOfMedian,
} from '../../data/benchmarks';

interface Props {
  state: RetirementState;
}

const fmt$ = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
};

function PercentileBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full dark:bg-slate-800 bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-extrabold w-10 text-right dark:text-slate-100 text-slate-800">
        {pct}th
      </span>
    </div>
  );
}

export const BenchmarkCompare: React.FC<Props> = ({ state }) => {
  const userNetWorth = useMemo(
    () => state.liquidCash + state.taxableInvestments + state.preTax401k + state.postTaxRothHsa,
    [state.liquidCash, state.taxableInvestments, state.preTax401k, state.postTaxRothHsa]
  );

  const band = getBandForAge(state.currentAge);

  const rows = useMemo(
    () =>
      REGION_BENCHMARKS.map((r) => {
        const wealthMedian = ageAdjustedWealthMedian(r, state.currentAge);
        const wealthPct = lognormalPercentile(userNetWorth, wealthMedian, r.sigmaWealth);
        const incomePct = lognormalPercentile(
          state.currentAnnualIncome,
          r.medianHouseholdIncomeUSD,
          r.sigmaIncome
        );
        const savePct = savingsPercentile(state.savingsRatePct, r.avgSavingsRatePct);
        return { region: r, wealthMedian, wealthPct, incomePct, savePct };
      }),
    [state.currentAge, state.currentAnnualIncome, state.savingsRatePct, userNetWorth]
  );

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div>
        <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <Globe2 className="w-4.5 h-4.5 text-blue-400 shrink-0" /> How You Compare Globally
        </h3>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
          You (age {state.currentAge}, wealth band “{band.label}”) vs typical households in 4 regions.
          Percentiles are illustrative estimates from a lognormal model — see sources below.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {rows.map(({ region, wealthMedian, wealthPct, incomePct, savePct }) => (
          <div
            key={region.id}
            className="rounded-2xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-slate-50 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold dark:text-slate-100 text-slate-900">
                {region.flagEmoji} {region.name}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Wealth: top {100 - wealthPct}% ≈ {wealthPct}th pct
              </span>
            </div>

            {/* Net worth (age-adjusted) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="dark:text-slate-300 text-slate-600 font-semibold">
                  Net worth (age {band.label})
                </span>
                <span className="dark:text-slate-400 text-slate-500">
                  You {fmt$(userNetWorth)} · typical {fmt$(wealthMedian)} ·{' '}
                  {multipleOfMedian(userNetWorth, wealthMedian)}×
                </span>
              </div>
              <PercentileBar pct={wealthPct} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
            </div>

            {/* Income */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="dark:text-slate-300 text-slate-600 font-semibold">Annual income</span>
                <span className="dark:text-slate-400 text-slate-500">
                  You {fmt$(state.currentAnnualIncome)} · typical{' '}
                  {fmt$(region.medianHouseholdIncomeUSD)} ·{' '}
                  {multipleOfMedian(state.currentAnnualIncome, region.medianHouseholdIncomeUSD)}×
                </span>
              </div>
              <PercentileBar pct={incomePct} color="bg-gradient-to-r from-emerald-500 to-teal-400" />
            </div>

            {/* Savings rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="dark:text-slate-300 text-slate-600 font-semibold">Savings rate</span>
                <span className="dark:text-slate-400 text-slate-500">
                  You {state.savingsRatePct}% · typical {region.avgSavingsRatePct}%
                </span>
              </div>
              <PercentileBar pct={savePct} color="bg-gradient-to-r from-amber-500 to-orange-400" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] dark:text-slate-500 text-slate-400 leading-relaxed flex items-start gap-1.5 border-t dark:border-slate-800 border-slate-200 pt-3">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Illustrative estimates, not exact statistics. Wealth medians are age-adjusted to your “{band.label}”
          band (US: Fed SCF 2022 bands; others scaled by the same age profile). Sources:{' '}
          {REGION_BENCHMARKS.map((r) => `${r.flagEmoji} ${r.sources}`).join(' · ')}. Cross-country
          income comparisons ignore taxes, household size, and cost of living.
        </span>
      </p>
    </div>
  );
};
