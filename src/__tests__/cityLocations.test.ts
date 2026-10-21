import { describe, it, expect } from 'vitest';
import { PRESET_COORDS, ALL_LOCATIONS, resolveLocation, nearestLocation } from '../data/cityLocations';

describe('cityLocations', () => {
  it('constants', () => {
    expect(Object.keys(PRESET_COORDS).length).toBeGreaterThan(0);
    expect(ALL_LOCATIONS.length).toBeGreaterThan(0);
  });
  it('resolveLocation fallback', () => {
    const loc = resolveLocation('NOPE');
    expect(loc).toBeTruthy();
    const loc2 = resolveLocation(ALL_LOCATIONS[0].id);
    expect(loc2.id).toBe(ALL_LOCATIONS[0].id);
  });
  it('nearestLocation', () => {
    const loc = nearestLocation(0, 0);
    expect(loc).toBeTruthy();
  });
});
