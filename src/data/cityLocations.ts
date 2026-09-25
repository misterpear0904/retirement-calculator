import { LOCATION_PRESETS, LocationCOL } from './colData';
import { MAJOR_CITIES } from './majorCities';
import { COUNTRY_COL, FALLBACK_COL } from './countryCol';

// Curated preset coordinates (city centres). Clicks near these resolve to the
// hand-tuned preset; generated 1M+ cities within 40km were dropped at build time.
export const PRESET_COORDS: Record<string, { lat: number; lon: number }> = {
  US_AVERAGE: { lat: 39.8, lon: -98.5 },
  FL_ORLANDO: { lat: 28.5, lon: -81.4 },
  TX_AUSTIN: { lat: 30.3, lon: -97.7 },
  NC_RALEIGH: { lat: 35.8, lon: -78.6 },
  AZ_PHOENIX: { lat: 33.4, lon: -112.1 },
  CA_BAY_AREA: { lat: 37.8, lon: -122.4 },
  NY_NYC: { lat: 40.7, lon: -74.0 },
  PT_LISBON: { lat: 38.7, lon: -9.1 },
  CR_SAN_JOSE: { lat: 9.9, lon: -84.1 },
  MX_PUERTO_VALLARTA: { lat: 20.6, lon: -105.2 },
  TH_CHIANG_MAI: { lat: 18.8, lon: 98.9 },
  ES_VALENCIA: { lat: 39.5, lon: -0.4 },
};

function slugify(s: string): string {
  const flat = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return flat.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function formatPop(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  return `${Math.round(p / 1_000)}k`;
}

/** Generated 1M+ city entries (country-level estimates, flagged isEstimate). */
export const GENERATED_CITY_LOCATIONS: LocationCOL[] = (() => {
  const seen = new Set<string>();
  const out: LocationCOL[] = [];
  for (const m of MAJOR_CITIES) {
    let id = `city_${slugify(m.n)}_${m.cc.toLowerCase()}`;
    if (seen.has(id)) {
      let i = 2;
      while (seen.has(`${id}_${i}`)) i++;
      id = `${id}_${i}`;
    }
    seen.add(id);
    const col = COUNTRY_COL[m.cc] ?? FALLBACK_COL;
    out.push({
      id,
      name: `${m.n} (${m.c})`,
      region: m.c,
      colIndex: col.col,
      stateTaxPct: 0,
      housingIndex: col.housing,
      healthcareIndex: col.health,
      description: `Major metro · ~${formatPop(m.p)} people · country-level estimate`,
      flagEmoji: '🏙️',
      lat: m.lat,
      lon: m.lon,
      isEstimate: true,
    });
  }
  return out;
})();

/** Every selectable location: curated presets first, then generated cities. */
export const ALL_LOCATIONS: LocationCOL[] = [...LOCATION_PRESETS, ...GENERATED_CITY_LOCATIONS];

const BY_ID = new Map<string, LocationCOL>(ALL_LOCATIONS.map((l) => [l.id, l]));

/** Drop-in replacement for `LOCATION_PRESETS.find(...) ?? LOCATION_PRESETS[0]`. */
export function resolveLocation(id: string): LocationCOL {
  return BY_ID.get(id) ?? LOCATION_PRESETS[0];
}

function coordsOf(loc: LocationCOL): { lat: number; lon: number } | null {
  if (loc.lat != null && loc.lon != null) return { lat: loc.lat, lon: loc.lon };
  const p = PRESET_COORDS[loc.id];
  return p ?? null;
}

/** Nearest selectable city to a lon/lat click (equirectangular, lat-weighted). */
export function nearestLocation(lon: number, lat: number): LocationCOL {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best: LocationCOL = LOCATION_PRESETS[0];
  let bestD = Infinity;
  for (const loc of ALL_LOCATIONS) {
    const c = coordsOf(loc);
    if (!c) continue;
    const dx = (c.lon - lon) * cosLat;
    const dy = c.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = loc;
    }
  }
  return best;
}
