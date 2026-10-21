// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { householdSsForYear } from '../utils/calculatorEngine';

describe('householdSsForYear (SSA survivor + spousal rules)', () => {
  const base = {
    primaryPIAMonthly: 3000,
    partnerPIAMonthly: 1000,
    primaryClaimAge: 67,
    partnerClaimAge: 67,
    inflationFactor: 1,
    primaryLifeExpectancy: 90,
    partnerLifeExpectancy: 80,
  };

  it('spousal top-up while both alive: max(own, 50% of primary PIA)', () => {
    const r = householdSsForYear({ ...base, primaryAge: 70, partnerAge: 70, partnerOn: true });
    // primary 36000 + max(12000, 18000) = 54000
    expect(r).toBeCloseTo(54000, 0);
  });

  it('survivor keeps the larger check (partner dies first)', () => {
    const r = householdSsForYear({ ...base, primaryAge: 82, partnerAge: 82, partnerOn: true });
    // partner deceased (LE 80) → max(36000, 12000) = 36000
    expect(r).toBeCloseTo(36000, 0);
  });

  it('survivor keeps the larger check (primary dies first)', () => {
    const r = householdSsForYear({
      ...base,
      primaryPIAMonthly: 1000,
      partnerPIAMonthly: 3000,
      primaryLifeExpectancy: 80,
      partnerLifeExpectancy: 90,
      primaryAge: 82,
      partnerAge: 82,
      partnerOn: true,
    });
    // primary deceased → partner's 36000
    expect(r).toBeCloseTo(36000, 0);
  });

  it('both deceased → 0', () => {
    const r = householdSsForYear({ ...base, primaryAge: 95, partnerAge: 85, partnerOn: true });
    expect(r).toBe(0);
  });

  it('no partner → only primary check', () => {
    const r = householdSsForYear({ ...base, primaryAge: 70, partnerAge: 70, partnerOn: false });
    expect(r).toBeCloseTo(36000, 0);
  });

  it('inflation factor scales the whole household benefit', () => {
    const r = householdSsForYear({ ...base, primaryAge: 70, partnerAge: 70, partnerOn: true, inflationFactor: 1.1 });
    expect(r).toBeCloseTo(54000 * 1.1, 0);
  });

  it('claiming early reduces the spousal top-up via spousalClaimFactor', () => {
    const r = householdSsForYear({
      ...base,
      primaryAge: 67,
      partnerAge: 62,
      partnerOn: true,
      partnerClaimAge: 62,
      primaryClaimAge: 62,
    });
    // primary claims at 62 (factor 0.7) → 3000*12*0.7 = 25200
    // spousal max = 0.5*3000*12*0.65 = 11700 (partner own 0 since age<claim? partnerAge 62 >= 62 → 1000*12*0.7=8400; max = 11700)
    // total = 25200 + 11700 = 36900
    expect(r).toBeCloseTo(36900, 0);
  });
});
