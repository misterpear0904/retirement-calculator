import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  ReferenceDot,
  Brush,
} from 'recharts';
import { YearlyProjection } from '../../types/retirement';
import { Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, Expand } from 'lucide-react';
import { FullscreenModal } from '../FullscreenModal';

interface Props {
  yearlyProjections: YearlyProjection[];
  targetRetirementAge: number;
  onSelectSection?: (sectionId: string) => void;
  /** Chart canvas height in px (larger when rendered inside the fullscreen modal). */
  height?: number;
  /** Set false for the instance rendered inside the fullscreen modal (avoids nested modals). */
  allowExpand?: boolean;
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

const formatYAxis = (num: number) => {
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  return `${sign}$${abs}`;
};

const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;

const CustomTooltip = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data: YearlyProjection = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[250px]">
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
            <span>Net Worth (Target):</span>
            <span className="text-cyan-400">{fmt$(data.netWorth50)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Conservative:</span>
            <span className="text-emerald-400">{fmt$(data.netWorth95)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Stress Test:</span>
            <span className="text-amber-400">{fmt$(data.netWorth10)}</span>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Living Expenses:</span>
            <span className="text-slate-200">{fmt$(data.livingExpenses)}</span>
          </div>
          {data.housingExpenses > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Housing Payment:</span>
              <span className="text-slate-200">{fmt$(data.housingExpenses)}</span>
            </div>
          )}
          {data.childEducationExpenses > 0 && (
            <div className="flex justify-between text-blue-300 font-semibold">
              <span>Child Tuition:</span>
              <span>{fmt$(data.childEducationExpenses)}</span>
            </div>
          )}
          {data.totalDebtBalance > 0 && (
            <div className="flex justify-between text-red-400 font-medium">
              <span>Mortgage / Debt Left:</span>
              <span>-{fmt$(data.totalDebtBalance)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'RetirementChartTooltip';

export const RetirementChart: React.FC<Props> = React.memo(({
  yearlyProjections,
  targetRetirementAge,
  onSelectSection,
  height = 360,
  allowExpand = true,
}) => {
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Zoom range as [startAge, endAge]; null = full horizon.
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

  const fullRange = useMemo<[number, number] | null>(() => {
    if (yearlyProjections.length === 0) return null;
    return [yearlyProjections[0].age, yearlyProjections[yearlyProjections.length - 1].age];
  }, [yearlyProjections]);

  // Reset zoom when the underlying horizon changes (new inputs).
  useEffect(() => {
    setZoomRange(null);
  }, [fullRange?.[0], fullRange?.[1]]);

  const viewRange: [number, number] | null = zoomRange ?? fullRange;
  const isZoomed =
    viewRange != null &&
    fullRange != null &&
    (viewRange[0] !== fullRange[0] || viewRange[1] !== fullRange[1]);

  const zoomAround = useCallback(
    (factor: number, center?: number | null) => {
      if (!viewRange || !fullRange) return;
      const [lo, hi] = viewRange;
      const [fullLo, fullHi] = fullRange;
      const fullSpan = Math.max(1, fullHi - fullLo);
      const span = Math.max(1, hi - lo);
      const next = Math.min(Math.max(5, span * factor), fullSpan);
      // Anchor-preserving: keep the cursor (or view center) at the same
      // relative position inside the new window.
      const c = Math.min(fullHi, Math.max(fullLo, center ?? (lo + hi) / 2));
      const ratio = span > 0 ? (c - lo) / span : 0.5;
      let nextLo = Math.round(c - next * ratio);
      let nextHi = nextLo + Math.round(next);
      if (nextLo < fullLo) {
        nextHi += fullLo - nextLo;
        nextLo = fullLo;
      }
      if (nextHi > fullHi) {
        nextLo -= nextHi - fullHi;
        nextHi = fullHi;
      }
      nextLo = Math.max(fullLo, nextLo);
      nextHi = Math.min(fullHi, nextHi);
      setZoomRange(nextHi - nextLo >= fullSpan ? null : [nextLo, nextHi]);
    },
    [viewRange, fullRange]
  );

  const zoomIn = useCallback(() => zoomAround(0.7), [zoomAround]);
  const zoomOut = useCallback(() => zoomAround(1.4), [zoomAround]);
  // brushKey remounts the (uncontrolled) Brush so its travellers reset.
  const [brushKey, setBrushKey] = useState(0);
  const resetZoom = useCallback(() => {
    setZoomRange(null);
    setBrushKey((k) => k + 1);
  }, []);

  // Brush drives zoom in one direction only (brush -> chart). Feeding the
  // zoom range back into the Brush as controlled props is what made dragging
  // fight the cursor, so the Brush stays uncontrolled and only remounts on
  // reset / horizon change.
  const handleBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number } | null) => {
      if (!fullRange || range?.startIndex == null || range?.endIndex == null) return;
      const lo = fullRange[0] + range.startIndex;
      const hi = fullRange[0] + range.endIndex;
      if (hi - lo < 2) return;
      if (lo === fullRange[0] && hi === fullRange[1]) setZoomRange(null);
      else setZoomRange([lo, hi]);
    },
    [fullRange]
  );

  // Scroll-to-zoom anchored at the hovered age. A native non-passive wheel
  // listener is required so the page doesn't scroll while zooming.
  const chartBoxRef = useRef<HTMLDivElement>(null);
  const anchorAgeRef = useRef<number | null>(null);

  useEffect(() => {
    const el = chartBoxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAround(e.deltaY > 0 ? 1.18 : 0.85, anchorAgeRef.current);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  const trackAnchor = useCallback((s: any) => {
    const label = s?.activeLabel;
    anchorAgeRef.current = typeof label === 'number' ? label : null;
  }, []);

  // Collect all milestone ages — memoized so hover re-renders don't recompute.
  const milestoneProjections = useMemo(
    () => yearlyProjections.filter((p) => p.milestones && p.milestones.length > 0),
    [yearlyProjections]
  );

  // Static milestone markers: a handful of ReferenceDots instead of a
  // per-point custom `dot` renderer (which re-created ~60 SVG nodes with
  // CSS pulse animations on every tooltip mousemove).
  const milestoneDots = useMemo(
    () =>
      milestoneProjections.map((p) => ({
        age: p.age,
        value: p.netWorth50,
        title: p.milestones.map((m) => m.title).join(', '),
      })),
    [milestoneProjections]
  );

  const handleBadgeClick = useCallback(
    (category: string) => {
      const secId = getSectionIdForCategory(category);
      if (onSelectSection) onSelectSection(secId);
      const elem = document.getElementById(secId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [onSelectSection]
  );

  const toggleBands = useCallback(() => setShowConfidenceBand((v) => !v), []);

  return (
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
            Multi-Scenario Net Worth Simulation
          </h3>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">
            Scenario bands: Conservative (optimistic returns), Target (expected), Stress Test (pessimistic). Monte Carlo success rate is shown above.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700" role="group" aria-label="Chart zoom">
            <button
              type="button"
              onClick={zoomIn}
              disabled={!viewRange}
              aria-label="Zoom chart in"
              title="Zoom in"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              disabled={!isZoomed}
              aria-label="Zoom chart out"
              title="Zoom out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={!isZoomed}
              aria-label="Reset chart zoom"
              title="Reset zoom"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={toggleBands}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-sm"
          >
            {showConfidenceBand ? <EyeOff className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
            {showConfidenceBand ? 'Hide Bands' : 'Show Confidence Bands'}
          </button>
          {allowExpand && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Expand chart fullscreen"
              title="Expand fullscreen"
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Expand className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Legend Badge Bar */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs dark:bg-slate-900/60 bg-slate-100 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-glow shrink-0"></span>
          <span className="text-slate-200 font-semibold">Target Case</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="text-slate-300">Conservative</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
          <span className="text-slate-300">Stress Test</span>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
          <span className="text-slate-400">Target Retirement Age ({targetRetirementAge})</span>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={chartBoxRef}
        className="w-full pt-2"
        style={{ height: height + 20, minHeight: height + 20 }}
        onDoubleClick={resetZoom}
        title="Scroll to zoom · double-click to reset"
      >
        <ResponsiveContainer width="100%" height={height} minHeight={height}>
          <ComposedChart
            data={yearlyProjections}
            margin={{ top: 15, right: 25, left: 25, bottom: 20 }}
            onMouseMove={trackAnchor}
            onMouseLeave={() => {
              anchorAgeRef.current = null;
            }}
          >
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
              type="number"
              domain={viewRange ?? ['dataMin', 'dataMax']}
              allowDataOverflow
              stroke="#64748b"
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              unit=" yrs"
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              stroke="#64748b"
              width={70}
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

            {/* Shaded Confidence Band & Scenario Lines */}
            {showConfidenceBand && (
              <>
                <Area
                  type="monotone"
                  dataKey="netWorth95"
                  stroke="none"
                  fill="url(#confidenceBand)"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth95"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth10"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </>
            )}

            {/* Main Target Case Line & Area — no per-point dots; milestones
                render as a few static ReferenceDots below. */}
            <Area
              type="monotone"
              dataKey="netWorth50"
              stroke="#38bdf8"
              strokeWidth={3}
              fill="url(#targetGradient)"
              dot={false}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {milestoneDots.map((m) => (
              <ReferenceDot
                key={`milestone_${m.age}`}
                x={m.age}
                y={m.value}
                r={6}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
            {/* Mini-overview zoom bar: drag the handles to zoom the main
                view to specific dates. Uncontrolled by design (see above). */}
            <Brush
              key={`${fullRange?.[0] ?? 0}-${fullRange?.[1] ?? 0}-${brushKey}`}
              dataKey="age"
              height={28}
              stroke="#38bdf8"
              fill="#0f172a"
              travellerWidth={12}
              onChange={handleBrushChange}
            >
              <ComposedChart>
                <Area
                  type="monotone"
                  dataKey="netWorth50"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.3}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </Brush>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-400">
        Scroll over the chart to zoom{isZoomed && viewRange ? (
          <>
            {' '}· zoomed to ages {viewRange[0]}–{viewRange[1]} ·{' '}
            <button type="button" onClick={resetZoom} className="text-blue-400 hover:underline font-semibold">
              Show full horizon
            </button>
          </>
        ) : (
          ' · double-click to reset'
        )}
      </p>

      {/* Milestone Badges Timeline Strip Below Chart */}
      {milestoneProjections.length > 0 && (
        <div className="pt-2 border-t dark:border-slate-800 border-slate-200">
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
      {expanded && allowExpand && (
        <FullscreenModal title="Net Worth Simulation" onClose={() => setExpanded(false)}>
          <RetirementChart
            yearlyProjections={yearlyProjections}
            targetRetirementAge={targetRetirementAge}
            onSelectSection={onSelectSection}
            height={typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 380) : 560}
            allowExpand={false}
          />
        </FullscreenModal>
      )}
    </div>
  );
});

RetirementChart.displayName = 'RetirementChart';
