import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Expand } from 'lucide-react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { GeometryCollection } from 'geojson';
import landTopology from '../../data/land110m.json';
import { nearestLocation, resolveLocation } from '../../data/cityLocations';
import { FullscreenModal } from '../FullscreenModal';
import type { LocationCOL } from '../../data/colData';

// Equirectangular world map (Natural Earth 110m land via world-atlas).
// Click anywhere → nearest 1M+ city (or hand-tuned preset near its coords).

const W = 1000;
const H = 500;
const lonToX = (lon: number) => ((lon + 180) / 360) * W;
const latToY = (lat: number) => ((90 - lat) / 180) * H;
const xToLon = (x: number) => (x / W) * 360 - 180;
const yToLat = (y: number) => 90 - (y / H) * 180;

const clampLon = (lon: number) => Math.min(180, Math.max(-180, lon));
const clampLat = (lat: number) => Math.min(90, Math.max(-90, lat));

function buildLandPaths(): string[] {
  try {
    const topo = landTopology as unknown as Topology;
    const landObj = topo.objects.land as unknown as GeometryCollection;
    const geo = feature(topo, landObj as unknown as Parameters<typeof feature>[1]) as unknown as
      | GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      | GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
    const polys: number[][][][] =
      geo.type === 'FeatureCollection'
        ? geo.features.flatMap((f) =>
            f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
          )
        : geo.geometry.type === 'Polygon'
          ? [geo.geometry.coordinates]
          : geo.geometry.coordinates;
    const out: string[] = [];
    for (const rings of polys) {
      const parts: string[] = [];
      for (const ring of rings) {
        if (ring.length === 0) continue;
        // Drop Antarctica (everything south of -60°) — it would otherwise
        // eat a sixth of the map height.
        if (ring.every((pt) => pt[1] < -60)) continue;
        // Unwrap longitudes so rings crossing the antimeridian stay
        // continuous instead of streaking across the whole map…
        let shift = 0;
        let prevRaw: number | null = null;
        const unwrapped = ring.map(([lo, la]: number[]) => {
          if (prevRaw != null) {
            if (prevRaw - lo > 180) shift += 360;
            else if (lo - prevRaw > 180) shift -= 360;
          }
          prevRaw = lo;
          return [lo + shift, clampLat(la)] as [number, number];
        });
        // …then draw three copies (±360°) and let the viewport clip the
        // overflow, so wrapped land appears correctly on both edges.
        for (const dx of [-W, 0, W]) {
          parts.push(
            unwrapped
              .map(
                ([lo, la], i) =>
                  `${i === 0 ? 'M' : 'L'}${(lonToX(lo) + dx).toFixed(1)},${latToY(la).toFixed(1)}`
              )
              .join(' ') + ' Z'
          );
        }
      }
      if (parts.length > 0) out.push(parts.join(' '));
    }
    return out;
  } catch {
    return [];
  }
}

const LAND_PATHS: string[] = buildLandPaths();

function formatPop(p: number): string {
  if (p >= 1_000_000) return `~${(p / 1_000_000).toFixed(1)}M people`;
  return `~${Math.round(p / 1_000)}k people`;
}

function CityDetails({ city }: { city: LocationCOL }) {
  return (
    <div className="rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900/70 bg-white/90 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-extrabold dark:text-slate-100 text-slate-900">
          {city.flagEmoji} {city.name}
        </span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
          COL {city.colIndex}
          {city.isEstimate ? ' (est.)' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg dark:bg-slate-800/60 bg-slate-200/60 border dark:border-slate-700/60 border-slate-300/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Housing</div>
          <div className="text-sm font-extrabold dark:text-slate-200 text-slate-800">{city.housingIndex}%</div>
        </div>
        <div className="rounded-lg dark:bg-slate-800/60 bg-slate-200/60 border dark:border-slate-700/60 border-slate-300/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Healthcare</div>
          <div className="text-sm font-extrabold dark:text-slate-200 text-slate-800">{city.healthcareIndex}%</div>
        </div>
        {city.isEstimate ? (
          <div className="rounded-lg dark:bg-slate-800/60 bg-slate-200/60 border dark:border-slate-700/60 border-slate-300/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Size</div>
            <div className="text-sm font-extrabold dark:text-slate-200 text-slate-800">
              {city.population ? formatPop(city.population) : '—'}
            </div>
          </div>
        ) : (
          <div className="rounded-lg dark:bg-slate-800/60 bg-slate-200/60 border dark:border-slate-700/60 border-slate-300/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">State/local tax</div>
            <div className="text-sm font-extrabold dark:text-slate-200 text-slate-800">{city.stateTaxPct}%</div>
          </div>
        )}
        <div className="rounded-lg dark:bg-slate-800/60 bg-slate-200/60 border dark:border-slate-700/60 border-slate-300/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Region</div>
          <div className="text-sm font-extrabold dark:text-slate-200 text-slate-800 truncate" title={city.region}>
            {city.region}
          </div>
        </div>
      </div>
      <p className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">
        {city.description}
        {city.isEstimate && ' · Country-level estimate, fine-tune with the COL slider below.'}
      </p>
    </div>
  );
}

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  /** Set false for the instance rendered inside the fullscreen modal (avoids nested modals). */
  allowExpand?: boolean;
  /** Show the hovered/selected city details panel (used in the expanded view). */
  showDetails?: boolean;
}

export const LocationMap: React.FC<Props> = ({
  selectedId,
  onSelect,
  allowExpand = true,
  showDetails = false,
}) => {
  // Hover tracks the nearest CITY id only, and only notifies React when it
  // changes — the previous version re-rendered 125 land paths on every
  // mousemove, which is what made the marker lag behind the cursor.
  const [hoverId, setHoverId] = useState<string | null>(null);
  const lastHoverId = useRef<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const selected = resolveLocation(selectedId);
  const hovered = hoverId ? resolveLocation(hoverId) : null;

  const selectedCoords = useMemo(() => {
    if (selected.lat != null && selected.lon != null)
      return { lat: selected.lat, lon: selected.lon };
    return null;
  }, [selected]);

  const hoveredCoords = useMemo(() => {
    if (hovered && hovered.lat != null && hovered.lon != null && hovered.id !== selected.id)
      return { lat: hovered.lat, lon: hovered.lon, name: hovered.name };
    return null;
  }, [hovered, selected.id]);

  const pointFromEvent = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return {
      lon: clampLon(xToLon(x)),
      lat: clampLat(yToLat(y)),
    };
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const { lon, lat } = pointFromEvent(e);
      const id = nearestLocation(lon, lat).id;
      if (id !== lastHoverId.current) {
        lastHoverId.current = id;
        setHoverId(id);
      }
    },
    [pointFromEvent]
  );

  const handleLeave = useCallback(() => {
    lastHoverId.current = null;
    setHoverId(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const { lon, lat } = pointFromEvent(e);
      onSelect(nearestLocation(lon, lat).id);
    },
    [pointFromEvent, onSelect]
  );

  const preview = hovered ?? selected;

  // Static backdrop: memoized once so hover updates never reconcile land.
  const backdrop = useMemo(() => {
    const gridStroke = isDark ? '#162032' : '#cbd5e1';
    const landFill = isDark ? '#223148' : '#bae6fd';
    const landStroke = isDark ? '#3b4f6e' : '#38bdf8';
    const gx: React.ReactNode[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      gx.push(
        <line key={`v${lon}`} x1={lonToX(lon)} y1={0} x2={lonToX(lon)} y2={H} stroke={gridStroke} strokeWidth={1} />
      );
    }
    const gy: React.ReactNode[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      gy.push(
        <line key={`h${lat}`} x1={0} y1={latToY(lat)} x2={W} y2={latToY(lat)} stroke={gridStroke} strokeWidth={1} />
      );
    }
    return (
      <>
        {gx}
        {gy}
        {LAND_PATHS.map((d, i) => (
          <path key={i} d={d} fill={landFill} stroke={landStroke} strokeWidth={0.8} />
        ))}
      </>
    );
  }, [isDark]);

  return (
    <div className="space-y-2">
      <div className={`relative rounded-xl border ${isDark ? 'dark:border-slate-800 border-slate-200 bg-[#0b1220]' : 'border-slate-200 bg-sky-50'} overflow-hidden`}>
        {allowExpand && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand map fullscreen"
            title="Expand fullscreen"
            className="absolute top-2 right-2 z-10 p-2 rounded-lg dark:bg-slate-900/80 bg-white/80 dark:text-slate-300 text-slate-700 hover:text-white hover:bg-slate-700 border dark:border-slate-700 border-slate-300 transition-colors"
          >
            <Expand className="w-4 h-4" />
          </button>
        )}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block cursor-crosshair"
          role="application"
          aria-label="World map. Click anywhere to select the nearest large city."
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
        >
          {backdrop}
          {/* Hovered city marker (stable city position — no cursor chasing) */}
          {hoveredCoords && (
            <g pointerEvents="none">
              <circle
                cx={lonToX(hoveredCoords.lon)}
                cy={latToY(hoveredCoords.lat)}
                r={9}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="3 2"
              />
              <text
                x={lonToX(hoveredCoords.lon)}
                y={latToY(hoveredCoords.lat) - 15}
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize={15}
                fontWeight={700}
                paintOrder="stroke"
                stroke="#0b1220"
                strokeWidth={4}
              >
                {hoveredCoords.name}
              </text>
            </g>
          )}
          {/* Selected city marker */}
          {selectedCoords && (
            <g pointerEvents="none">
              <circle
                cx={lonToX(selectedCoords.lon)}
                cy={latToY(selectedCoords.lat)}
                r={16}
                fill="#38bdf8"
                opacity={0.25}
                className="animate-pulse"
              />
              <circle
                cx={lonToX(selectedCoords.lon)}
                cy={latToY(selectedCoords.lat)}
                r={7}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={lonToX(selectedCoords.lon)}
                y={latToY(selectedCoords.lat) - 16}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={16}
                fontWeight={700}
                paintOrder="stroke"
                stroke="#0b1220"
                strokeWidth={4}
              >
                {selected.name}
              </text>
            </g>
          )}
        </svg>
      </div>
      {showDetails ? (
        <CityDetails city={preview} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] dark:text-slate-400 text-slate-600">
          <span>
            {hovered && hovered.id !== selected.id ? 'Nearest city: ' : 'Selected: '}
            <strong className="dark:text-slate-200 text-slate-800">
              {preview.flagEmoji} {preview.name}
            </strong>{' '}
            (COL {preview.colIndex}
            {preview.isEstimate ? ', est.' : ''})
          </span>
          <span>Click anywhere — snaps to the nearest city of 1M+ people.</span>
        </div>
      )}
      {expanded && allowExpand && (
        <FullscreenModal title="Pick a retirement destination" onClose={() => setExpanded(false)}>
          <LocationMap
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect(id);
              setExpanded(false);
            }}
            allowExpand={false}
            showDetails
          />
        </FullscreenModal>
      )}
    </div>
  );
};
