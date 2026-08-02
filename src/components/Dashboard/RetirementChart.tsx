import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Dot,
} from 'recharts';
import { YearlyProjection, TimelineMilestone } from '../../types/retirement';
import { Info, Eye, EyeOff } from 'lucide-react';

interface Props {
  yearlyProjections: YearlyProjection[];
  targetRetirementAge: number;
  onSelectSection?: (sectionId: string) => void;
}

// Map milestone category to accordion section id
const getSectionIdForCategory = (category: string) => {
  switch (category) {
    case 'education': return 'dependents';
    case 'housing': return 'housing';
    case 'retirement': return 'demographics';
    case 'income': return 'location';
    default: return 'demographics';
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data: YearlyProjection = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[250px]">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="font-extrabold text-slate-100">
            Age {data.age} ({data.year})
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              data.isRetired ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {data.isRetired ? 'Retired' : 'Accumulating'}
          </span>
        </div>

        {/* Milestones in Tooltip */}
        {data.milestones && data.milestones.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg space-y-1">
            {data.milestones.map((m, i) => (
              <div key={i} className="text-[11px] font-semibold text-blue-300">
                {m.title}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 pt-1">
          <div className="flex justify-between font-bold text-slate-100">
            <span>Net Worth (Target 50%):</span>
            <span className="text-cyan-400">${data.netWorth50.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Conservative (95%):</span>
            <span className="text-emerald-400">${data.netWorth95.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Stress Test (10%):</span>
            <span className="text-amber-400">${data.netWorth10.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Living Expenses:</span>
            <span className="text-slate-200">${data.livingExpenses.toLocaleString()}</span>
          </div>
          {data.housingExpenses > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Housing Payment:</span>
              <span className="text-slate-200">${data.housingExpenses.toLocaleString()}</span>
            </div>
          )}
          {data.childEducationExpenses > 0 && (
            <div className="flex justify-between text-blue-300 font-semibold">
              <span>Child Tuition:</span>
              <span>${data.childEducationExpenses.toLocaleString()}</span>
            </div>
          )}
          {data.totalDebtBalance > 0 && (
            <div className="flex justify-between text-red-400 font-medium">
              <span>Mortgage / Debt Left:</span>
              <span>-${data.totalDebtBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const RetirementChart: React.FC<Props> = ({
  yearlyProjections,
  targetRetirementAge,
  onSelectSection,
}) => {
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);

  // Format large numbers for Y Axis
  const formatYAxis = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num}`;
  };

  // Collect all milestone ages
  const milestoneProjections = yearlyProjections.filter(
    (p) => p.milestones && p.milestones.length > 0
  );

  const handleBadgeClick = (category: string) => {
    const secId = getSectionIdForCategory(category);
    if (onSelectSection) onSelectSection(secId);
    const elem = document.getElementById(secId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Multi-Scenario Net Worth Simulation
          </h3>
          <p className="text-xs text-slate-400">
            Confidence bands: 95th Percentile (Conservative), 50th Percentile (Target), 10th Percentile (Stress Test)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowConfidenceBand(!showConfidenceBand)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {showConfidenceBand ? <EyeOff className="w-3.5 h-3.5 text-blue-400" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
            {showConfidenceBand ? 'Hide Bands' : 'Show Confidence Bands'}
          </button>
        </div>
      </div>

      {/* Legend Badge Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow"></span>
          <span className="text-slate-200 font-semibold">Target Case (50th %)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">Conservative (95th %)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400"></span>
          <span className="text-slate-300">Stress Test (10th %)</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="text-slate-400">Target Retirement Age ({targetRetirementAge})</span>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="min-h-[380px] h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height={360} minHeight={360}>
          <ComposedChart data={yearlyProjections} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="age"
              stroke="#64748b"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              unit=" yrs"
            />
            <YAxis
              stroke="#64748b"
              tickLine={false}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Target Retirement Reference Vertical Line */}
            <ReferenceLine
              x={targetRetirementAge}
              stroke="#a855f7"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Retire (Age ${targetRetirementAge})`,
                fill: '#c084fc',
                fontSize: 11,
                position: 'top',
              }}
            />

            {/* Shaded Confidence Band & Percentile Lines (95th & 10th) */}
            {showConfidenceBand && (
              <>
                <Area
                  type="monotone"
                  dataKey="netWorth95"
                  stroke="none"
                  fill="url(#confidenceBand)"
                />
                <Line
                  type="monotone"
                  dataKey="netWorth95"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth10"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </>
            )}

            {/* Main 50th Percentile (Target Case) Line & Area */}
            <Area
              type="monotone"
              dataKey="netWorth50"
              stroke="#38bdf8"
              strokeWidth={3}
              fill="url(#targetGradient)"
              dot={(props: any) => {
                const { payload, cx, cy } = props;
                if (payload && payload.milestones && payload.milestones.length > 0) {
                  return (
                    <circle
                      key={`dot_${payload.age}`}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="animate-pulse cursor-pointer"
                    />
                  );
                }
                return <React.Fragment key={`dot_empty_${props.index || Math.random()}`} />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone Badges Timeline Strip Below Chart */}
      {milestoneProjections.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Clickable Timeline Event Badges (Scrolls to Input Section)
          </h4>
          <div className="flex flex-wrap gap-2">
            {milestoneProjections.map((p) =>
              p.milestones.map((m, idx) => (
                <button
                  key={`${p.age}_${idx}`}
                  type="button"
                  onClick={() => handleBadgeClick(m.category)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700/60 hover:border-blue-500/50 text-slate-200 transition-all text-left"
                >
                  <span className="font-bold text-blue-400">Age {p.age}:</span>
                  <span>{m.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
