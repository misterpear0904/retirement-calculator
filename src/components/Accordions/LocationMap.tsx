import React, { useState, useMemo, useCallback } from 'react';
import { Expand } from 'lucide-react';
import { feature } from 'topojson-client';
import landTopology from '../../data/land110m.json';
import { nearestLocation, resolveLocation } from '../../data/cityLocations';
import { FullscreenModal } from '../FullscreenModal';

// Equirectangular world map (Natural Earth 110m land via world-atlas).
// Click anywhere → nearest 1M+ city (or hand-tuned preset near its coords).

const W = 1000;
const H = 500;
const lonToX = (lon: number) => ((lon + 180) / 360) * W;
const latToY = (lat: number) => ((90 - lat) / 180) * H;
const xToLon = (x: number) => (x / W) * 360 - 180;
const yToLat = (y: number) => 90 - (y / H) * 180;

function buildLandPaths(): string[] {
  try {
    const geo: any = feature(
      landTopology as any,
      (landTopology as any).objects.land
    );
    const polys: number[][][][] =
      geo.type === 'FeatureCollection'
        ? geo.features.flatMap((f: any) =>
            f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
          )
        : geo.geometry.type === 'Polygon'
          ? [geo.geometry.coordinates]
          : geo.geometry.coordinates;
    return polys.map((rings) =>
      rings
        .map(
          (ring) =>
            ring
              .map((pt, i) => `${i === 0 ? 'M' : 'L'}${lonToX(pt[0]).toFixed(1)},${latToY(pt[1]).toFixed(1)}`)
              .join(' ') + ' Z'
        )
        .join(' ')
    );
  } catch {
    return [];
  }
}

const LAND_PATHS: string[] = buildLandPaths();

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  /** Set false for the instance rendered inside the fullscreen modal (avoids nested modals). */
  allowExpand?: boolean;
}

export const LocationMap: React.FC<Props> = ({ selectedId, onSelect, allowExpand = true }) => {
  const [hoverLonLat, setHoverLonLat] = useState<{ lon: number; lat: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selected = resolveLocation(selectedId);

  const hovered = useMemo(
    () => (hoverLonLat ? nearestLocation(hoverLonLat.lon, hoverLonLat.lat) : null),
    [hoverLonLat]
  );

  // Selected marker coordinates: resolve from generated entry, else preset table.
  const selectedCoords = useMemo(() => {
    if (selected.lat != null && selected.lon != null)
      return { lat: selected.lat, lon: selected.lon };
    return null;
  }, [selected]);

  const pointFromEvent = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return {
      lon: Math.min(180, Math.max(-180, xToLon(x))),
      lat: Math.min(90, Math.max(-90, yToLat(y))),
    };
  }, []);

  const preview = hovered ?? selected;

  const graticuleX = useMemo(() => {
    const arr: number[] = [];
    for (let lon = -180; lon <= 180; lon += 30) arr.push(lon);
    return arr;
  }, []);
  const graticuleY = useMemo(() => {
    const arr: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30) arr.push(lat);
    return arr;
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border border-slate-800 bg-[#0b1220] overflow-hidden">
        {allowExpand && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand map fullscreen"
            title="Expand fullscreen"
            className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Expand className="w-4 h-4" />
          </button>
        )}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block cursor-crosshair"
          role="application"
          aria-label="World map. Click anywhere to select the nearest large city."
          onMouseMove={(e) => setHoverLonLat(pointFromEvent(e))}
          onMouseLeave={() => setHoverLonLat(null)}
          onClick={(e) => {
            const { lon, lat } = pointFromEvent(e);
            onSelect(nearestLocation(lon, lat).id);
          }}
        >
          {/* Graticule */}
          {graticuleX.map((lon) => (
            <line
              key={`v${lon}`}
              x1={lonToX(lon)}
              y1={0}
              x2={lonToX(lon)}
              y2={H}
              stroke="#162032"
              strokeWidth={1}
            />
          ))}
          {graticuleY.map((lat) => (
            <line
              key={`h${lat}`}
              x1={0}
              y1={latToY(lat)}
              x2={W}
              y2={latToY(lat)}
              stroke="#162032"
              strokeWidth={1}
            />
          ))}
          {/* Land masses */}
          {LAND_PATHS.map((d, i) => (
            <path key={i} d={d} fill="#223148" stroke="#3b4f6e" strokeWidth={0.8} />
          ))}
          {/* Hover preview marker */}
          {hoverLonLat && hovered && hovered.id !== selected.id && (
            <circle
              cx={lonToX(hoverLonLat.lon)}
              cy={latToY(hoverLonLat.lat)}
              r={6}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              pointerEvents="none"
            />
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
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          {preview ? (
            <>
              {hovered && hovered.id !== selected.id ? 'Nearest city: ' : 'Selected: '}
              <strong className="text-slate-200">
                {preview.flagEmoji} {preview.name}
              </strong>{' '}
              (COL {preview.colIndex}
              {preview.isEstimate ? ', est.' : ''})
            </>
          ) : (
            'Hover the map to preview the nearest city.'
          )}
        </span>
        <span>Click anywhere — snaps to the nearest city of 1M+ people.</span>
      </div>
      {expanded && allowExpand && (
        <FullscreenModal title="Pick a retirement destination" onClose={() => setExpanded(false)}>
          <LocationMap selectedId={selectedId} onSelect={onSelect} allowExpand={false} />
        </FullscreenModal>
      )}
    </div>
  );
};
