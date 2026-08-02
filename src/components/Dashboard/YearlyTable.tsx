import React, { useState } from 'react';
import { YearlyProjection } from '../../types/retirement';
import { Table, Download, Search } from 'lucide-react';

interface Props {
  yearlyProjections: YearlyProjection[];
}

export const YearlyTable: React.FC<Props> = ({ yearlyProjections }) => {
  const [filterRetiredOnly, setFilterRetiredOnly] = useState(false);

  const displayedProjections = filterRetiredOnly
    ? yearlyProjections.filter((p) => p.isRetired)
    : yearlyProjections;

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Table className="w-4 h-4 text-blue-400" /> Yearly Financial Cash Flow & Balance Schedule
        </h3>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterRetiredOnly(!filterRetiredOnly)}
            className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              filterRetiredOnly
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {filterRetiredOnly ? 'Showing Retirement Only' : 'Show All Years'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-2.5">Age (Year)</th>
              <th className="p-2.5">Phase</th>
              <th className="p-2.5 text-right">Gross Income</th>
              <th className="p-2.5 text-right">Contributions</th>
              <th className="p-2.5 text-right">Total Expenses</th>
              <th className="p-2.5 text-right">Net Withdrawal</th>
              <th className="p-2.5 text-right font-bold text-slate-200">Portfolio Net Worth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {displayedProjections.map((p) => (
              <tr key={p.age} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-2.5 font-sans font-medium text-slate-300">
                  Age {p.age} <span className="text-[10px] text-slate-500">({p.year})</span>
                </td>
                <td className="p-2.5 font-sans">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.isRetired ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {p.isRetired ? 'Retirement' : 'Work'}
                  </span>
                </td>
                <td className="p-2.5 text-right text-slate-300">${p.grossIncome.toLocaleString()}</td>
                <td className="p-2.5 text-right text-emerald-400">
                  {p.totalContributions > 0 ? `+$${p.totalContributions.toLocaleString()}` : '-'}
                </td>
                <td className="p-2.5 text-right text-slate-300">${p.totalExpenses.toLocaleString()}</td>
                <td className="p-2.5 text-right text-amber-400">
                  {p.netWithdrawalNeeded > 0 ? `-$${p.netWithdrawalNeeded.toLocaleString()}` : '-'}
                </td>
                <td className="p-2.5 text-right font-bold text-cyan-400">
                  ${p.totalPortfolio.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
