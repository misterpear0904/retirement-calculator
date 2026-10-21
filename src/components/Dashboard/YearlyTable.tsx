import React, { useState } from 'react';
import { YearlyProjection } from '../../types/retirement';
import { Table, Download } from 'lucide-react';

interface Props {
  yearlyProjections: YearlyProjection[];
}

const CSV_HEADERS = [
  'Year',
  'Age',
  'Retired',
  'Net Worth 50',
  'Net Worth 95',
  'Net Worth 10',
  'Liquid',
  'Taxable',
  'Pre-Tax',
  'Post-Tax',
  'Debt',
  'Gross Income',
  'Contributions',
  'Living',
  'Housing',
  'Education',
  'Healthcare',
  'Debt Payments',
  'Total Expenses',
  'Withdrawal Needed',
  'Tax Paid',
  'Roth Converted',
] as const;

/** CSV cell: quote only when the value contains a comma, quote, or newline. */
export function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize the currently shown yearly projections to CSV (raw numerics, one header row). */
export function buildCsv(rows: YearlyProjection[]): string {
  const lines: string[] = [CSV_HEADERS.map(csvCell).join(',')];
  for (const p of rows) {
    const cells: (string | number)[] = [
      p.year,
      p.age,
      p.isRetired ? 'yes' : 'no',
      p.netWorth50,
      p.netWorth95,
      p.netWorth10,
      p.liquidCash,
      p.taxableInvestments,
      p.preTaxAccount,
      p.postTaxAccount,
      p.totalDebtBalance,
      p.grossIncome,
      p.totalContributions,
      p.livingExpenses,
      p.housingExpenses,
      p.childEducationExpenses,
      p.healthcareExpenses,
      p.debtPayments,
      p.totalExpenses,
      p.netWithdrawalNeeded,
      p.taxPaid,
      p.rothConverted,
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return lines.join('\r\n');
}

function downloadCsv(rows: YearlyProjection[]): void {
  const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apexretire-yearly.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const YearlyTable: React.FC<Props> = ({ yearlyProjections }) => {
  const [filterRetiredOnly, setFilterRetiredOnly] = useState(false);

  const displayedProjections = filterRetiredOnly
    ? yearlyProjections.filter((p) => p.isRetired)
    : yearlyProjections;

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <Table className="w-4 h-4 text-blue-400 shrink-0" /> Yearly Financial Cash Flow & Balance Schedule
        </h3>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterRetiredOnly(!filterRetiredOnly)}
            className={`px-3.5 py-2 rounded-xl font-semibold border transition-all shadow-sm ${
              filterRetiredOnly
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 dark:border-slate-700 border-slate-300 hover:text-white'
            }`}
          >
            {filterRetiredOnly ? 'Show all years' : 'Show retirement years only'}
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(displayedProjections)}
            disabled={displayedProjections.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold border transition-all shadow-sm dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 dark:border-slate-700 border-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border dark:border-slate-800 border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 dark:bg-slate-900/95 bg-white/95 backdrop-blur-md dark:text-slate-300 text-slate-700 font-semibold border-b dark:border-slate-800 border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">Age (Year)</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">Phase</th>
              <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">Gross Income</th>
              <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">Contributions</th>
              <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">Total Expenses</th>
              <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">Net Withdrawal</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold dark:text-slate-100 text-slate-900 whitespace-nowrap">Total Portfolio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {displayedProjections.map((p) => (
              <tr key={p.age} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-sans font-medium dark:text-slate-300 text-slate-700 whitespace-nowrap">
                  Age {p.age} <span className="text-xs text-slate-500">({p.year})</span>
                </td>
                <td className="px-4 py-3 font-sans whitespace-nowrap">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                      p.isRetired ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    }`}
                  >
                    {p.isRetired ? 'Retirement' : 'Work'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right dark:text-slate-300 text-slate-700 whitespace-nowrap">${p.grossIncome.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-400 whitespace-nowrap">
                  {p.totalContributions > 0 ? `+$${p.totalContributions.toLocaleString()}` : '-'}
                </td>
                <td className="px-4 py-3 text-right dark:text-slate-300 text-slate-700 whitespace-nowrap">${p.totalExpenses.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-amber-400 whitespace-nowrap">
                  {p.netWithdrawalNeeded > 0 ? `-$${p.netWithdrawalNeeded.toLocaleString()}` : '-'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-cyan-400 whitespace-nowrap">
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
